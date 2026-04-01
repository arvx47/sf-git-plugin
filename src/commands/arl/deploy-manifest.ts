import { Args } from '@oclif/core'
import { Flags, SfCommand } from '@salesforce/sf-plugins-core'
import { ComponentSet } from '@salesforce/source-deploy-retrieve'

export default class ArlDeployManifest extends SfCommand<void> {
  static description = 'Deploy using a package.xml manifest file'

  static examples = [
    'sf arl deploy-manifest package.xml',
    'sf arl deploy-manifest releases/v1.0/package.xml',
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
    const { args, flags } = await this.parse(ArlDeployManifest)

    const org = flags['target-org']
    const connection = org.getConnection(flags['api-version'])

    const cs = await ComponentSet.fromManifest({
      manifestPath: args.manifest as string,
      resolveSourcePaths: ['.'],
    })

    this.spinner.start('Deploying...')

    const deploy = await cs.deploy({ usernameOrConnection: connection })

    deploy.onUpdate((response) => {
      const { numberComponentsDeployed, numberComponentsTotal } = response
      this.spinner.status = `${numberComponentsDeployed}/${numberComponentsTotal} components`
    })

    const result = await deploy.pollStatus()
    this.spinner.stop()

    if (result.response.success) {
      this.log(`Deploy successful. ${result.response.numberComponentsDeployed} components deployed.`)
    } else {
      const errors = result.response.details?.componentFailures
      const messages = Array.isArray(errors)
        ? errors.map((e) => e.problem).join('\n')
        : String(errors?.problem ?? 'Unknown error')
      this.error(`Deploy failed:\n${messages}`)
    }
  }
}
