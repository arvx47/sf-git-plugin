import { Flags, SfCommand } from '@salesforce/sf-plugins-core'
import { ComponentSet } from '@salesforce/source-deploy-retrieve'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CMD } from '../../constants.js'

export default class ArlValidate extends SfCommand<void> {
  static description = 'Validate a deployment without actually deploying'

  static examples = [
    `${CMD} validate force-app/main/default/classes/MyClass.cls`,
    `${CMD} validate --manifest releases/v1.0 (uses releases/v1.0/package.xml and tests.txt)`,
  ]

  static strict = false

  static flags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    manifest: Flags.boolean({
      char: 'm',
      description: 'Validate using package.xml and tests.txt from a release folder',
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(ArlValidate)

    if (argv.length === 0) {
      this.error('A target path is required')
    }

    const org = flags['target-org']
    const connection = org.getConnection(flags['api-version'])

    let cs: ComponentSet
    let runTests: string[] | undefined

    if (flags.manifest) {
      const folder = argv[0] as string
      cs = await ComponentSet.fromManifest({
        manifestPath: join(folder, 'package.xml'),
        resolveSourcePaths: ['.'],
      })
      const testsFile = readFileSync(join(folder, 'tests.txt'), 'utf8')
      runTests = testsFile.trim().split(/\s+/).filter(Boolean)
    } else {
      cs = await ComponentSet.fromSource({ fsPaths: argv as string[] })
    }

    this.spinner.start('Validating deployment...')

    const deploy = await cs.deploy({
      usernameOrConnection: connection,
      apiOptions: {
        checkOnly: true,
        ...(runTests ? { runTests, testLevel: 'RunSpecifiedTests' } : {}),
      },
    })

    deploy.onUpdate((response) => {
      const { numberComponentsDeployed, numberComponentsTotal } = response
      this.spinner.status = `${numberComponentsDeployed}/${numberComponentsTotal} components`
    })

    const result = await deploy.pollStatus()
    this.spinner.stop()

    if (result.response.success) {
      this.log('Validation successful! Deployment would succeed.')
    } else {
      const errors = result.response.details?.componentFailures
      const messages = Array.isArray(errors)
        ? errors.map((e) => e.problem).join('\n')
        : String(errors?.problem ?? 'Unknown error')
      this.error(`Validation failed:\n${messages}`)
    }
  }
}
