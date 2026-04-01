import { Flags, SfCommand } from '@salesforce/sf-plugins-core'
import { TestService, TestLevel } from '@salesforce/apex-node'
import type { TestResult } from '@salesforce/apex-node'

export default class ArlTests extends SfCommand<void> {
  static description = 'Run Apex tests by class name'

  static examples = [
    'sf arl tests MyClassTest',
    'sf arl tests MyClassTest AnotherTest',
  ]

  static strict = false

  static flags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
  }

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(ArlTests)

    if (argv.length === 0) {
      this.error('At least one test class name is required')
    }

    const org = flags['target-org']
    const connection = org.getConnection(flags['api-version'])

    this.spinner.start(`Running ${argv.length} test class(es)...`)

    const testService = new TestService(connection)

    const rawResult = await testService.runTestAsynchronous({
      classNames: (argv as string[]).join(','),
      testLevel: TestLevel.RunSpecifiedTests,
      skipCodeCoverage: false,
    })

    this.spinner.stop()

    // runTestAsynchronous without immediatelyReturn=true always resolves to TestResult
    const result = rawResult as TestResult
    const { summary, tests } = result

    this.log(`\nTests run: ${summary.testsRan}, Passed: ${summary.passing}, Failed: ${summary.failing}`)

    if (summary.failing > 0) {
      const failures = tests.filter((t) => t.outcome === 'Fail')
      for (const f of failures) {
        this.log(`\nFAIL: ${f.apexClass.name}.${f.methodName}`)
        this.log(`  ${f.message ?? ''}`)
        if (f.stackTrace) this.log(`  ${f.stackTrace}`)
      }
      this.error(`${summary.failing} test(s) failed.`)
    } else {
      this.log('All tests passed!')
    }
  }
}
