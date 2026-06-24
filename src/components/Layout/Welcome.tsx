import { openFileDialog, openFileByPath } from '@/stores/documentStore'

import { useSettingsStore } from '@/stores/settingsStore'



export function Welcome() {

  const recentFiles = useSettingsStore((s) => s.recentFiles)



  return (

    <div className="welcome">

      <div className="welcome-card">

        <h1>MDTool</h1>

        <p>本地 Markdown 阅读器 — 高亮、笔记、进度记忆</p>



        <button type="button" className="primary-btn" onClick={() => void openFileDialog()}>

          打开 Markdown 文件

        </button>



        <p className="welcome-hint">或将 .md 文件拖拽到窗口中</p>



        {recentFiles.length > 0 && (

          <div className="recent-files">

            <h2>最近打开</h2>

            <ul>

              {recentFiles.map((path) => (

                <li key={path}>

                  <button type="button" onClick={() => openFileByPath(path)}>

                    {path}

                  </button>

                </li>

              ))}

            </ul>

          </div>

        )}

      </div>

    </div>

  )

}

