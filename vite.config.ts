import { defineConfig, type Plugin } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

const PORT = 5173

/**
 * 让访问地址始终留在终端最下方。
 * Vite 只在启动时打印一次 Local 地址，之后每次热更新都会把它顶上去，
 * 这个插件在每次 HMR 后补打一行，最新输出永远是地址。
 */
function stickyUrl(port: number): Plugin {
  const line = `\x1b[2m  ➜\x1b[0m  \x1b[36mhttp://localhost:${port}/\x1b[0m`
  return {
    name: 'sticky-url',
    apply: 'serve',
    handleHotUpdate() {
      // 延后一点，等 Vite 自己的 "hmr update" 日志先打印完
      setTimeout(() => console.log(`\n${line}\n`), 20)
    }
  }
}

export default defineConfig({
  plugins: [uni(), stickyUrl(PORT)],
  server: {
    host: '127.0.0.1',
    port: PORT,
    // 不清屏，保留历史日志，方便往上翻
    clearScreen: false
  }
})
