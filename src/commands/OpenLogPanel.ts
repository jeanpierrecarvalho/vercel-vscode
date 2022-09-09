import { Command } from '../CommandManager'
import { LogPanelManager } from '../features/LogPanelManager'

export class OpenLogPanel implements Command {
  public readonly id = 'vscode-vercel.openLogPanel'
  constructor(private readonly manager: LogPanelManager) {}
  execute(id: string, name: string, initialStatus: string) {
    this.manager.createOrShow(id, name, initialStatus)
  }
}
