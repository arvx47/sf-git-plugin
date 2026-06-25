import { Args } from '@oclif/core'
import { Flags, SfCommand } from '@salesforce/sf-plugins-core'
import { SfProject } from '@salesforce/core'
import { ComponentSet } from '@salesforce/source-deploy-retrieve'
import { join } from 'node:path'
import { CMD } from '../../constants.js'

export default class ArlRetrieveManifest extends SfCommand<void> {
  static description = 'Retrieve using a package.xml manifest file'

  static examples = [
    `${CMD} retrieve-manifest package.xml`,
    `${CMD} retrieve-manifest releases/v1.0/package.xml`,
  ]

  static args = {
    manifest: Args.file({ description: 'Path to package.xml', required: true }),
  }

  static flags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ArlRetrieveManifest)

    const org = flags['target-org']
    const connection = org.getConnection(flags['api-version'])

    const cs = await ComponentSet.fromManifest({
      manifestPath: args.manifest as string,
      resolveSourcePaths: ['.'],
    })

    const project = await SfProject.resolve()
    const outputDir = join(project.getPath(), project.getDefaultPackage().path)

    this.spinner.start('Retrieving...')

    const retrieve = await cs.retrieve({
      usernameOrConnection: connection,
      output: outputDir,
      merge: true,
    })

    retrieve.onUpdate((response) => {
      this.spinner.status = `Status: ${response.status}`
    })

    const result = await retrieve.pollStatus()
    this.spinner.stop()

    if (result.response.status === 'Succeeded') {
      const fp = result.response.fileProperties
      const count = fp ? (Array.isArray(fp) ? fp.length : 1) : 0
      this.log(`Retrieve successful. ${count} components retrieved.`)
    } else {
      const messages = result.response.messages
      const details = Array.isArray(messages)
        ? messages.map((m) => m.problem).join('\n')
        : String(messages ?? 'Unknown error')
      this.error(`Retrieve failed:\n${details}`)
    }
  }
}
