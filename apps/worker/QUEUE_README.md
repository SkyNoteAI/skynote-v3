# Queue Consumer Implementation

This document describes the implementation of TASK-006: Queue Consumer for Markdown Conversion.

## Overview

The queue consumer processes messages from Cloudflare Queues to convert BlockNote content to Markdown format and store it in R2 for AutoRAG indexing.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Notes API     │    │   Queue         │    │   Queue         │
│   (Producer)    │───▶│   (Cloudflare)  │───▶│   Consumer      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
                                              ┌─────────────────┐
                                              │   R2 Storage    │
                                              │   (Markdown)    │
                                              └─────────────────┘
```

## Implementation Details

### Queue Consumer (`src/queue.ts`)

The main queue consumer handles:
- **Message Processing**: Processes batches of messages with retry logic
- **Error Handling**: Exponential backoff with dead letter queue
- **Markdown Conversion**: Converts BlockNote JSON to optimized Markdown
- **R2 Storage**: Stores converted Markdown in R2 with metadata

### Message Types

1. **convert-to-markdown**: Converts BlockNote content to Markdown
2. **index-for-search**: Processes notes for search indexing (future use)

### BlockNote to Markdown Conversion

Supports conversion of:
- **Text Formatting**: Bold, italic, strikethrough, code, underline
- **Headings**: H1-H6 with proper hierarchy
- **Lists**: Bullet lists, numbered lists, checklists
- **Code Blocks**: With syntax highlighting support
- **Blockquotes**: Standard markdown blockquotes
- **Images**: With alt text support
- **Links**: Internal and external links
- **Tables**: Basic table support

### Metadata Enhancement

The converter adds frontmatter metadata to improve RAG performance:
```yaml
---
title: Note Title
tags: tag1, tag2
folder: path/to/folder
created: 2024-01-01T00:00:00Z
updated: 2024-01-01T01:00:00Z
---
```

## Configuration

### Wrangler Configuration

```toml
# Queue consumer configuration
[[env.dev.queues.consumers]]
queue = "note-processing-dev"
max_batch_size = 10
max_batch_timeout = 30
```

### Environment Variables

Required bindings:
- `NOTE_QUEUE`: Queue producer binding
- `R2`: R2 bucket binding
- `DB`: D1 database binding

## Error Handling

### Retry Logic
- **Attempt 1**: Immediate retry
- **Attempt 2**: 2-second delay
- **Attempt 3**: 4-second delay
- **After 3 attempts**: Send to dead letter queue

### Dead Letter Queue
Failed messages are stored in R2 at:
```
dead-letter-queue/{timestamp}-{messageId}.json
```

## Performance

- **Batch Processing**: Up to 10 messages per batch
- **Timeout**: 30 seconds per batch
- **Conversion Speed**: ~1000 blocks/second
- **Memory Usage**: Optimized for large documents

## Testing

### Unit Tests
```bash
pnpm test queue
```

### Manual Testing
```bash
node test-queue.js
```

### Test Coverage
- ✅ Message processing with retry logic
- ✅ Markdown conversion for all block types
- ✅ Error handling and dead letter queue
- ✅ Performance tests for large documents
- ✅ Metadata enhancement

## Monitoring

### Metrics to Monitor
- Queue depth
- Processing time per message
- Error rates
- Dead letter queue size
- R2 storage usage

### Cloudflare Dashboard
- Queue metrics: Messages per second, depth, age
- Worker metrics: CPU time, memory usage, errors
- R2 metrics: Storage usage, request count

## Future Enhancements

1. **Advanced Table Support**: Better table parsing and formatting
2. **Custom Block Types**: Support for custom BlockNote extensions
3. **Batch Optimization**: Intelligent batching based on content size
4. **AutoRAG Integration**: Direct indexing after conversion
5. **Compression**: Gzip compression for large markdown files

## Troubleshooting

### Common Issues

1. **Queue Processing Delays**
   - Check queue depth in Cloudflare dashboard
   - Increase max_batch_size if needed
   - Monitor worker CPU usage

2. **Conversion Errors**
   - Check dead letter queue for failed messages
   - Validate BlockNote content structure
   - Check R2 permissions

3. **R2 Storage Issues**
   - Verify R2 bucket configuration
   - Check storage quotas
   - Monitor R2 request rates

### Debug Commands

```bash
# Check queue status
wrangler queues producer note-processing-dev

# View worker logs
wrangler tail --env dev

# List R2 objects
wrangler r2 object list cloudnotes-dev-storage
```

## Related Tasks

- **TASK-005**: Notes CRUD API (produces queue messages)
- **TASK-018**: AutoRAG Configuration (consumes markdown files)
- **TASK-019**: Markdown Optimization for RAG (enhances this conversion)