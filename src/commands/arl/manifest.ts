import { Flags, SfCommand } from '@salesforce/sf-plugins-core'
import { ComponentSet } from '@salesforce/source-deploy-retrieve'
import { execSync } from 'node:child_process'

export default class ArlManifest extends SfCommand<void> {
  static description = 'Generate a package.xml manifest from source files and copy it to clipboard'

  static examples = [
    'sf arl manifest force-app/main/default/classes/MyClass.cls',
    'sf arl manifest force-app/main/default/classes force-app/main/default/triggers',
  ]

  static strict = false

  static flags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.optionalOrg(),
    'api-version': Flags.orgApiVersion(),
    deploy: Flags.boolean({
      char: 'd',
      description: 'Deploy using the generated manifest after generating it',
      default: false,
    }),
    retrieve: Flags.boolean({
      char: 'r',
      description: 'Retrieve using the generated manifest after generating it',
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(ArlManifest)

    if (argv.length === 0) {
      this.error('At least one file or directory is required')
    }

    this.log(`Generating manifest for ${argv.length} path(s)...`)

    const cs = await ComponentSet.fromSource({ fsPaths: argv as string[] })
    const packageXml = await cs.getPackageXml()

    // Copy to clipboard using pbcopy (macOS system tool)
    execSync('pbcopy', { input: packageXml })
    this.log('package.xml copied to clipboard.')
    this.log(packageXml)

    if (flags.deploy || flags.retrieve) {
      const org = flags['target-org']
      if (!org) {
        this.error('--target-org is required when using --deploy or --retrieve')
      }
      const connection = org.getConnection(flags['api-version'])

      if (flags.deploy) {
        this.spinner.start('Deploying...')
        const deploy = await cs.deploy({ usernameOrConnection: connection })
        deploy.onUpdate((response) => {
          this.spinner.status = `${response.numberComponentsDeployed}/${response.numberComponentsTotal} components`
        })
        const result = await deploy.pollStatus()
        this.spinner.stop()
        if (result.response.success) {
          this.log('Deploy successful.')
        } else {
          this.error('Deploy failed.')
        }
      }

      if (flags.retrieve) {
        this.spinner.start('Retrieving...')
        const retrieve = await cs.retrieve({
          usernameOrConnection: connection,
          output: '.',
          merge: true,
        })
        retrieve.onUpdate((response) => {
          this.spinner.status = `Status: ${response.status}`
        })
        const result = await retrieve.pollStatus()
        this.spinner.stop()
        if (result.response.status === 'Succeeded') {
          this.log('Retrieve successful.')
        } else {
          this.error('Retrieve failed.')
        }
      }
    }
  }
}
