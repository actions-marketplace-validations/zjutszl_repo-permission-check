# repo-permission-check

This action check actor's permission in current repo.

## Inputs

### `permission`

**Required** The least permission user need to proceed.

### `files`

**Required** check whether target files is changed within current commits.

## Outputs

### `pass`

(boolean) The result of permission check.

## Example usage

```yaml
uses: actions/repo-permission-check@v1
with:
  role: 'write'
  files: |
    ya?ml$
```
