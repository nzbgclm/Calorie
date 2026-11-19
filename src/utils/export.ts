import { getEntries, getProfile, getSettings, getWeights } from './storage'
import { today } from './date'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const plus: any

/** 汇总全部本地数据，供导出或备份 */
export function collectAllData() {
  const info = uni.getStorageInfoSync()
  const months = info.keys
    .filter((key) => key.startsWith('entries:'))
    .map((key) => key.replace('entries:', ''))
    .sort()

  const entries: Record<string, unknown[]> = {}
  months.forEach((month) => {
    const list = getEntries(month)
    if (list.length) entries[month] = list
  })

  return {
    app: '卡路里',
    schema: 1,
    exportedAt: new Date().toISOString(),
    profile: getProfile(),
    settings: getSettings(),
    weights: getWeights(),
    entries
  }
}

/**
 * 导出为 JSON 文件。
 * H5 直接触发下载；App 端写入文档目录后唤起系统分享。
 */
export function exportAllData(): void {
  let json = ''
  try {
    json = JSON.stringify(collectAllData(), null, 2)
  } catch (e) {
    console.error('[export] stringify failed', e)
    uni.showToast({ title: '数据整理失败', icon: 'none' })
    return
  }

  const fileName = `calorie-backup-${today()}.json`

  // #ifdef H5
  try {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    uni.showToast({ title: '已开始下载', icon: 'none' })
  } catch (e) {
    console.error('[export] h5 failed', e)
    uni.showToast({ title: '导出失败', icon: 'none' })
  }
  // #endif

  // #ifdef APP-PLUS
  plus.io.requestFileSystem(
    plus.io.PRIVATE_DOC,
    (fs) => {
      fs.root.getFile(
        fileName,
        { create: true },
        (entry) => {
          entry.createWriter((writer) => {
            writer.onwrite = () => {
              uni.shareWithSystem({
                type: 'file',
                filePath: entry.fullPath,
                success: () => {},
                fail: () => {
                  uni.showModal({
                    title: '已导出',
                    content: `文件保存在应用文档目录：\n${entry.fullPath}`,
                    showCancel: false
                  })
                }
              } as never)
            }
            writer.onerror = () => {
              uni.showToast({ title: '写入失败', icon: 'none' })
            }
            writer.write(json)
          })
        },
        () => uni.showToast({ title: '创建文件失败', icon: 'none' })
      )
    },
    () => uni.showToast({ title: '无法访问文件系统', icon: 'none' })
  )
  // #endif
}
