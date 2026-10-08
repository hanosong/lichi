param(
    [Parameter(Mandatory = $true)]
    [string]$HtmlPath,

    [Parameter(Mandatory = $true)]
    [string]$PdfPath,

    [int]$PageCount = 0,

    [string]$PreviewDirectory = ""
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Resolve-ExistingFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "HTML file not found: $Path"
    }

    return (Resolve-Path -LiteralPath $Path).Path
}

function Resolve-OutputPath {
    param([string]$Path)

    $full = [System.IO.Path]::GetFullPath($Path)
    $parent = Split-Path -Parent $full

    if (-not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    return $full
}

function Find-Browser {
    $candidates = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "${env:LocalAppData}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return $candidate
        }
    }

    throw "Chrome or Edge was not found. Install one before exporting PDF."
}

function New-TempProfile {
    $path = Join-Path $env:TEMP ("market-pay-pdf-" + [guid]::NewGuid().ToString("n"))
    New-Item -ItemType Directory -Path $path | Out-Null
    return $path
}

$htmlFull = Resolve-ExistingFile -Path $HtmlPath
$pdfFull = Resolve-OutputPath -Path $PdfPath
$browser = Find-Browser
$uri = ([Uri]$htmlFull).AbsoluteUri

if (Test-Path -LiteralPath $pdfFull) {
    Remove-Item -LiteralPath $pdfFull -Force
}

$profile = New-TempProfile

try {
    $arguments = @(
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--allow-file-access-from-files",
        "--user-data-dir=$profile",
        "--print-to-pdf=$pdfFull",
        $uri
    )

    $process = Start-Process -FilePath $browser -ArgumentList $arguments -PassThru -Wait

    if ($process.ExitCode -ne 0) {
        throw "Browser PDF export failed with exit code $($process.ExitCode)."
    }

    if (-not (Test-Path -LiteralPath $pdfFull -PathType Leaf)) {
        throw "Browser finished but PDF was not created: $pdfFull"
    }

    $pdf = Get-Item -LiteralPath $pdfFull
    if ($pdf.Length -lt 1024) {
        throw "PDF is unexpectedly small ($($pdf.Length) bytes): $pdfFull"
    }

    Write-Output "PDF_OK path=$pdfFull bytes=$($pdf.Length)"
}
finally {
    if (Test-Path -LiteralPath $profile) {
        Remove-Item -LiteralPath $profile -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if ($PageCount -gt 0) {
    if ([string]::IsNullOrWhiteSpace($PreviewDirectory)) {
        $PreviewDirectory = Join-Path (Split-Path -Parent $pdfFull) "_preview"
    }

    $previewFull = Resolve-OutputPath -Path (Join-Path $PreviewDirectory "placeholder")
    $previewFull = Split-Path -Parent $previewFull

    for ($index = 0; $index -lt $PageCount; $index++) {
        $png = Join-Path $previewFull ("page-{0:D2}.png" -f ($index + 1))
        $pageUri = $uri + "?p=" + $index
        $shotProfile = New-TempProfile

        try {
            $shotArguments = @(
                "--headless=new",
                "--disable-gpu",
                "--allow-file-access-from-files",
                "--hide-scrollbars",
                "--window-size=1080,1920",
                "--user-data-dir=$shotProfile",
                "--screenshot=$png",
                $pageUri
            )

            $shot = Start-Process -FilePath $browser -ArgumentList $shotArguments -PassThru -Wait

            if ($shot.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $png -PathType Leaf)) {
                throw "Preview capture failed for page $($index + 1)."
            }

            $image = Get-Item -LiteralPath $png
            Write-Output "PREVIEW_OK page=$($index + 1) path=$png bytes=$($image.Length)"
        }
        finally {
            if (Test-Path -LiteralPath $shotProfile) {
                Remove-Item -LiteralPath $shotProfile -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
