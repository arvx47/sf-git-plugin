# sf-git-plugin

Salesforce CLI plugin with git-based commands for deploying, retrieving, and managing org metadata.

## Installation

```bash
sf plugins install sf-git-plugin
```

Or link locally during development:

```bash
npm install
npm run build
sf plugins link .
```

## Commands

### `sf git deploy <paths...>`

Deploy source files to the org.

```bash
sf git deploy force-app/main/default/classes/MyClass.cls --target-org myorg
sf git deploy force-app/main/default/classes force-app/main/default/triggers --target-org myorg
sf git deploy force-app/main/default/classes/MyClass.cls -c --target-org myorg  # ignore conflicts
```

**Flags:**
- `--target-org` — target org username or alias (required)
- `--api-version` — API version override
- `-c, --ignore-conflicts` — ignore conflicts during deployment

---

### `sf git retrieve <paths...>`

Retrieve source files from the org into the default package directory.

```bash
sf git retrieve force-app/main/default/classes/MyClass.cls --target-org myorg
sf git retrieve force-app/main/default/classes force-app/main/default/triggers --target-org myorg
```

**Flags:**
- `--target-org` — target org username or alias (required)
- `--api-version` — API version override

---

### `sf git delete <paths...>`

Delete source components from the org (destructive deployment).

```bash
sf git delete force-app/main/default/classes/OldClass.cls --target-org myorg
```

**Flags:**
- `--target-org` — target org username or alias (required)
- `--api-version` — API version override

---

### `sf git validate <paths...>`

Validate a deployment without deploying. Supports validating from source paths or a release folder containing `package.xml` and `tests.txt`.

```bash
sf git validate force-app/main/default/classes/MyClass.cls --target-org myorg
sf git validate releases/v1.0 --manifest --target-org myorg
```

**Flags:**
- `--target-org` — target org username or alias (required)
- `--api-version` — API version override
- `-m, --manifest` — validate using `package.xml` and `tests.txt` from a release folder

When `--manifest` is used, the argument is a folder path containing:
- `package.xml` — components to validate
- `tests.txt` — whitespace-separated list of Apex test class names to run

---

### `sf git manifest <paths...>`

Generate a `package.xml` from source files and copy it to the clipboard (macOS). Optionally deploy or retrieve immediately after.

```bash
sf git manifest force-app/main/default/classes/MyClass.cls
sf git manifest force-app/main/default/classes --deploy --target-org myorg
sf git manifest force-app/main/default/classes --retrieve --target-org myorg
```

**Flags:**
- `--target-org` — target org username or alias (required with `--deploy` or `--retrieve`)
- `--api-version` — API version override
- `-d, --deploy` — deploy after generating the manifest
- `-r, --retrieve` — retrieve after generating the manifest

---

### `sf git deploy-manifest <manifest>`

Deploy using a `package.xml` manifest file.

```bash
sf git deploy-manifest package.xml --target-org myorg
sf git deploy-manifest releases/v1.0/package.xml --target-org myorg
```

**Flags:**
- `--target-org` — target org username or alias (required)
- `--api-version` — API version override

---

### `sf git retrieve-manifest <manifest>`

Retrieve using a `package.xml` manifest file into the default package directory.

```bash
sf git retrieve-manifest package.xml --target-org myorg
sf git retrieve-manifest releases/v1.0/package.xml --target-org myorg
```

**Flags:**
- `--target-org` — target org username or alias (required)
- `--api-version` — API version override

---

### `sf git tests <classNames...>`

Run Apex test classes by name and display results.

```bash
sf git tests MyClassTest --target-org myorg
sf git tests MyClassTest AnotherTest --target-org myorg
```

**Flags:**
- `--target-org` — target org username or alias (required)
- `--api-version` — API version override

---

### `sf git log`

Tail org debug logs, printing only `USER_DEBUG` and `FATAL_ERROR` lines. Press `Ctrl+C` to stop.

```bash
sf git log --target-org myorg
```

**Flags:**
- `--target-org` — target org username or alias (required)
- `--api-version` — API version override

## Development

```bash
npm install
npm run build
```
