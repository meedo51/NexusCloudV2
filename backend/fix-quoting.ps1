param([string]$FilePath)

$content = Get-Content -Raw $FilePath

# List of camelCase column names used in the schema that need quoting
$columns = @(
  'passwordHash', 'displayName', 'storageQuotaBytes', 'usedStorageBytes', 
  'preferredView', 'two_factor_secret', 'two_factor_enabled', 'backup_codes',
  'createdAt', 'originalName', 'mimeType', 'folderId', 'userId', 'isFolder',
  'deletedAt', 'updatedAt', 'fileId', 'expiresAt', 'itemId', 'versionNumber',
  'storagePath', 'createdBy', 'itemType', 'itemName', 'ipAddress', 'userAgent',
  'maxSizeBytes', 'allowedTypes', 'ownerId', 'workspaceId', 'invitedBy', 'joinedAt',
  'addedBy', 'addedAt', 'contentText', 'searchVector', 'extractedAt'
)

# Quote each occurrence that's not already quoted
foreach ($col in $columns) {
  $quoted = "`"$col`""
  # Replace unquoted occurrences that are standalone words (not part of a string/comment)
  $content = [regex]::Replace($content, "(?<=[^`"'\w])$col(?=\s*(?:TEXT|VARCHAR|BIGINT|INTEGER|BOOLEAN|UUID|TIMESTAMPTZ|JSONB|TSVECTOR|SERIAL|PRIMARY|NOT|DEFAULT|UNIQUE|REFERENCES|,|\)|\s))", $quoted)
}

Set-Content -NoNewline -Path $FilePath -Value $content
Write-Output "Done: $FilePath"
