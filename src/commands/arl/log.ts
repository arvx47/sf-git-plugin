import { Flags, SfCommand } from '@salesforce/sf-plugins-core'
import { LogService } from '@salesforce/apex-node'

export default class ArlLog extends SfCommand<void> {
  static description = 'Tail org debug logs, showing only USER_DEBUG and FATAL_ERROR entries'

  static examples = [
    'sf arl log',
  ]

  static flags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ArlLog)

    const org = flags['target-org']
    const connection = org.getConnection(flags['api-version'])

    this.log('Tailing logs... (Ctrl+C to stop)')

    const logService = new LogService(connection)

    await logService.tail(org, (log: string) => {
      const filteredLines = log
        .split('\n')
        .filter((line) => line.includes('USER_DEBUG') || line.includes('FATAL_ERROR'))
      for (const line of filteredLines) {
        this.log(line)
      }
    })
  }
}
