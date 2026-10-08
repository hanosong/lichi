# Chrome 弹窗不显示（Quark 正常）

## 现象

点击「添加打印机」等会打开弹窗的按钮后：

- **谷歌浏览器**：遮罩和弹窗都不出现
- **夸克浏览器**：弹窗正常显示

相关样式类原先为 `.modal-backdrop`。

## 原因

有两层，第一层最常见。

### 1. 广告拦截插件隐藏了 `.modal-backdrop`

`.modal-backdrop` 是 Bootstrap 弹窗遮罩的经典类名。uBlock Origin、AdBlock 等插件的过滤列表会把它当成广告遮罩，用 CSS 直接隐藏，例如：

```css
.modal-backdrop { display: none !important; }
```

Chrome 用户经常安装这类插件；夸克一般没有，所以两边表现不一致。  
页面逻辑其实已经把弹窗渲染出来了，只是被插件从视觉上抹掉。

### 2. Chrome 对 `backdrop-filter` + 透明度动画的绘制问题

原先遮罩写在同一个元素上：

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(35, 37, 34, .56);
  backdrop-filter: blur(5px);
  animation: fade-in .16s ease;
}

@keyframes fade-in { from { opacity: 0; } }
```

Chrome 在「带 `backdrop-filter` 的元素上做 `opacity` 动画」时，有时会不绘制这一层，遮罩看起来像没出来。夸克内核处理方式不同，所以可能不受影响。

另外，弹窗当时挂在页面内部（`.app-shell` / `.main-content` 里），`position: fixed` 有可能被父级层叠上下文限制，不能盖住全屏。

## 处理

改了三处，对应上面的原因。

| 改动 | 目的 |
| --- | --- |
| 类名改为 `dialog-mask` | 避开广告拦截对 `.modal-backdrop` 的规则 |
| 用 `createPortal` 挂到 `document.body` | 弹窗脱离页面内部层叠，保证盖住全屏 |
| 模糊效果放到 `::before` | `backdrop-filter` 不再和淡入动画抢同一层 |

核心结构：

```jsx
function Modal({ title, onClose, children, wide = false }) {
  return createPortal(
    <div className="dialog-mask" onMouseDown={onClose}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} onMouseDown={(event) => event.stopPropagation()}>
        {/* ... */}
      </section>
    </div>,
    document.body,
  );
}
```

```css
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  padding: 24px;
  display: grid;
  place-items: center;
  isolation: isolate;
  animation: fade-in .16s ease;
}

.dialog-mask::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(35, 37, 34, .56);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  pointer-events: none;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

涉及文件：

- `src/App.jsx`：Portal 挂载、类名替换
- `src/styles.css`：遮罩样式拆分

## 验证

1. Chrome 强制刷新（Ctrl + F5）后，打开「添加打印机」、新建/编辑标签、打印确认，弹窗都应出现。
2. 若仍没有，先关掉广告拦截插件再试；能出现则说明还有别的类名被拦截，继续避开常见广告类名即可。
3. 夸克里原有流程应保持正常。

## 以后注意

自定义弹窗不要用广告插件常拦截的类名，例如：

- `modal-backdrop`
- `modal-overlay`
- `popup-overlay`
- `ad-overlay`

更稳妥的名字：`dialog-mask`、`app-overlay`、`scrim` 等。

需要全屏遮罩时，优先用 Portal 挂到 `document.body`，不要把 `position: fixed` 的弹窗埋在带 `transform` / `filter` / Grid 层叠的父级里。
