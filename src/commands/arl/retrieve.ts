import { Flags, SfCommand } from '@salesforce/sf-plugins-core'
import { SfProject } from '@salesforce/core'
import { ComponentSet } from '@salesforce/source-deploy-retrieve'
import { join } from 'node:path'

export default class ArlRetrieve extends SfCommand<void> {
  static description = 'Retrieve source files from the org'

  static examples = [
    'sf arl retrieve force-app/main/default/classes/MyClass.cls',
    'sf arl retrieve force-app/main/default/classes force-app/main/default/triggers',
  ]

  static strict = false

  static flags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
  }

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(ArlRetrieve)

    if (argv.length === 0) {
      this.error('At least one file or directory is required')
    }

    const org = flags['target-org']
    const connection = org.getConnection(flags['api-version'])
    const cs = await ComponentSet.fromSource({ fsPaths: argv as string[] })

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
