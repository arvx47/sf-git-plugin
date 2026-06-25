import { Flags, SfCommand } from '@salesforce/sf-plugins-core'
import { ComponentSet, DestructiveChangesType } from '@salesforce/source-deploy-retrieve'
import { CMD } from '../../constants.js'

export default class ArlDelete extends SfCommand<void> {
  static description = 'Delete source files from the org'

  static examples = [
    `${CMD} delete force-app/main/default/classes/OldClass.cls`,
  ]

  static strict = false

  static flags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
  }

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(ArlDelete)

    if (argv.length === 0) {
      this.error('At least one file or directory is required')
    }

    const org = flags['target-org']
    const connection = org.getConnection(flags['api-version'])
    const sourceCS = await ComponentSet.fromSource({ fsPaths: argv as string[] })

    // Build a new ComponentSet where all components are marked as destructive (post-deploy deletion)
    const deleteCS = new ComponentSet()
    for (const component of sourceCS.getSourceComponents()) {
      deleteCS.add(component, DestructiveChangesType.POST)
    }

    this.spinner.start('Deleting from org...')

    const deploy = await deleteCS.deploy({ usernameOrConnection: connection })

    deploy.onUpdate((response) => {
      const { numberComponentsDeployed, numberComponentsTotal } = response
      this.spinner.status = `${numberComponentsDeployed}/${numberComponentsTotal} components`
    })

    const result = await deploy.pollStatus()
    this.spinner.stop()

    if (result.response.success) {
      this.log('Delete successful.')
    } else {
      const errors = result.response.details?.componentFailures
      const messages = Array.isArray(errors)
        ? errors.map((e) => e.problem).join('\n')
        : String(errors?.problem ?? 'Unknown error')
      this.error(`Delete failed:\n${messages}`)
    }
  }
}
