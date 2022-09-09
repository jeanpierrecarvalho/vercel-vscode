/* eslint-disable @typescript-eslint/naming-convention */
// 👆 because vercel API requires ALLCAP keys

export type Project = {
  id: string
  name: string
  updatedAt: number
}

export type Team = {
  id: string
  slug: string
  name: string
}

export type Deployment = {
  uid: string
  name: string
  url: string
  created: number
  creator: Map<string, unknown>
  state: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED'
  meta: Meta<Provider>
  target: string
}

export type Meta<T extends Provider> = {
  [K in MetaKeys<T>]: string
}

type Provider = 'bitbucket' | 'github' | 'gitlab'
type MetaStates =
  | 'CommitAuthorName'
  | 'CommitMessage'
  | 'CommitOrg'
  | 'CommitRef'
  | 'CommitRepo'
  | 'CommitRepoId'
  | 'CommitSha'
  | 'Deployment'
  | 'Org'
  | 'Repo'
  | 'RepoId'
  | 'CommitAuthorLogin'
type MetaKeys<T extends Provider> = `${T}${MetaStates}`
