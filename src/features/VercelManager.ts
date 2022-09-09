/* eslint-disable @typescript-eslint/naming-convention */
// 👆 because vercel API requires snake_case keys

import * as polka from 'polka'
import * as qs from 'querystring'
import * as vscode from 'vscode'
import { nanoid } from 'nanoid'
import axios from 'axios'
import urlcat from 'urlcat'

import { Deployment, Project, Team } from './models'
import { TokenManager } from './TokenManager'

class Api {
  private static baseUrl = 'https://api.vercel.com'
  private static base(path?: string, query?: Record<string, string>) {
    return urlcat(this.baseUrl, path ?? '', query ?? {})
  }

  public static oauth = {
    accessToken: Api.base('/v2/oauth/access_token'),
    authorize: (query: Record<string, string>) =>
      Api.base('/v2/oauth/authorize', query),
  }
  public static deployments = Api.base('/v5/now/deployments')
  public static teams = Api.base('/v1/teams')
  public static porjects = Api.base('/v4/projects')
}

export class VercelManager {
  public onDidLogOut: () => void = () => {}
  public onDidDeploymentsUpdated: () => void = () => {}

  public onDidTeamsUpdated: () => void = () => {}
  public onDidTeamSelected: () => void = () => {}

  public onDidProjectsUpdated: () => void = () => {}
  public onDidProjectSelected: () => void = () => {}

  public constructor(private readonly token: TokenManager) {
    setInterval(() => {
      this.onDidDeploymentsUpdated()
    }, 30 * 1000)
  }

  public logIn() {
    const uuid = nanoid()
    const app = polka()

    app.get('/oauth/callback', async (req, res) => {
      const { code, state } = req.query as { code: string; state: string }

      if (!code || !state) {
        res.end('something went wrong')
        return
      }

      if (state !== uuid) {
        res.end('invalid authentication')
        return
      }

      try {
        const response = await axios.post<{ access_token: string }>(
          Api.oauth.accessToken,
          qs.stringify({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code,
            redirect_uri: `http://localhost:${process.env.CALLBACK_PORT}/oauth/callback`,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        )

        if (response.data.access_token) {
          await this.token.setAuth(response.data.access_token)
          this.onDidDeploymentsUpdated()
          this.onDidTeamsUpdated()
          this.onDidProjectsUpdated()
          res.end('successfully authenticated! you can close this now')
        }
      } catch (e) {
        console.log(e)
        res.end('error exchanging access token')
      } finally {
        app.server?.close()
      }
    })

    app.listen(process.env.CALLBACK_PORT, (err: Error) => {
      if (err) {
        vscode.window.showErrorMessage(err.message)
      } else {
        vscode.commands.executeCommand(
          'vscode.open',
          vscode.Uri.parse(
            Api.oauth.authorize({
              client_id: process.env.CLIENT_ID,
              state: uuid,
            })
          )
        )
      }
    })
  }

  async logOut() {
    await this.token.setAuth(undefined)
    await this.token.setTeam(undefined)
    await this.token.setProject(undefined)

    this.onDidLogOut()
    this.onDidDeploymentsUpdated()
    this.onDidTeamsUpdated()
    this.onDidProjectsUpdated()
  }

  async getDeployments() {
    if (this.token.getAuth()) {
      const response = await axios.get<{ deployments: Array<Deployment> }>(
        urlcat(Api.deployments, {
          teamId: this.selectedTeam,
          projectId: this.selectedProject,
        }),
        {
          headers: {
            Authorization: `Bearer ${this.token.getAuth()}`,
          },
        }
      )
      return response.data
    } else {
      return { deployments: [] }
    }
  }

  async getTeams() {
    if (this.token.getAuth()) {
      const response = await axios.get<{ teams: Array<Team> }>(Api.teams, {
        headers: {
          Authorization: `Bearer ${this.token.getAuth()}`,
        },
      })
      return response.data
    } else {
      return { teams: [] }
    }
  }

  get selectedTeam() {
    return this.token.getTeam()
  }

  async switchTeam(id: string) {
    if (this.selectedTeam === id) {
      await this.token.setTeam(undefined)
    } else {
      await this.token.setTeam(id)
    }
    this.onDidTeamSelected()
    this.onDidDeploymentsUpdated()
  }

  async getProjects() {
    if (this.token.getAuth()) {
      const response = await axios.get<{ projects: Array<Project> }>(
        Api.porjects,
        {
          headers: {
            Authorization: `Bearer ${this.token.getAuth()}`,
          },
        }
      )
      return response.data
    } else {
      return { projects: [] }
    }
  }

  get selectedProject() {
    return this.token.getProject()
  }

  async switchProject(id: string) {
    if (this.selectedProject === id) {
      await this.token.setProject(undefined)
    } else {
      await this.token.setProject(id)
    }
    this.onDidProjectSelected()
    this.onDidDeploymentsUpdated()
  }
}
