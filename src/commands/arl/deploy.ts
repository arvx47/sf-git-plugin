import { Flags, SfCommand } from '@salesforce/sf-plugins-core'
import { ComponentSet } from '@salesforce/source-deploy-retrieve'

export default class ArlDeploy extends SfCommand<void> {
  static description = 'Deploy source files to the org'

  static examples = [
    'sf arl deploy force-app/main/default/classes/MyClass.cls',
    'sf arl deploy force-app/main/default/classes force-app/main/default/triggers',
  ]

  static strict = false

  static flags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'ignore-conflicts': Flags.boolean({
      char: 'c',
      description: 'Ignore conflicts during deployment',
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(ArlDeploy)

    if (argv.length === 0) {
      this.error('At least one file or directory is required')
    }

    const org = flags['target-org']
    const connection = org.getConnection(flags['api-version'])
    const cs = await ComponentSet.fromSource({ fsPaths: argv as string[] })

    this.spinner.start('Deploying...')

    const deploy = await cs.deploy({
      usernameOrConnection: connection,
      apiOptions: { ignoreWarnings: flags['ignore-conflicts'] },
    })

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
