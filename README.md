# repo permission check

This action check actor's permission in current repo.

## Inputs

### `role`

**Required** The least permission user need to proceed.

### `path`

if path provided, check whether target file is changed within current commits.
if not, check only the permission of this repo.

## Outputs

### `authorized`

(boolean) The result of permission check.


## Example usage

```yaml
uses: actions/repo-permission-check@v1
with:
  role: 'write'
  path: './.github/.workflow/**'
```