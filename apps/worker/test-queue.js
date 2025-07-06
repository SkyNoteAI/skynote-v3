#!/usr/bin/env node

/**
 * Manual test script for queue functionality
 * This script tests the BlockNote to Markdown conversion
 */

import { convertBlocksToMarkdown } from './src/queue.js';

// Test data - various BlockNote content structures
const testCases = [
  {
    name: 'Simple paragraph',
    blocks: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'This is a simple paragraph.' }],
      },
    ],
  },
  {
    name: 'Headings',
    blocks: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Main Title' }],
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Subtitle' }],
      },
    ],
  },
  {
    name: 'Formatted text',
    blocks: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'This is ', attrs: {} },
          { type: 'text', text: 'bold', attrs: { bold: true } },
          { type: 'text', text: ' and ', attrs: {} },
          { type: 'text', text: 'italic', attrs: { italic: true } },
          { type: 'text', text: ' text.' },
        ],
      },
    ],
  },
  {
    name: 'Lists',
    blocks: [
      {
        type: 'bulletListItem',
        content: [{ type: 'text', text: 'First bullet item' }],
      },
      {
        type: 'bulletListItem',
        content: [{ type: 'text', text: 'Second bullet item' }],
      },
      {
        type: 'numberedListItem',
        content: [{ type: 'text', text: 'First numbered item' }],
      },
    ],
  },
  {
    name: 'Complex content with metadata',
    blocks: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Meeting Notes' }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Date: ', attrs: { bold: true } },
          { type: 'text', text: '2024-01-15' },
        ],
      },
      {
        type: 'checkListItem',
        attrs: { checked: true },
        content: [{ type: 'text', text: 'Review quarterly goals' }],
      },
      {
        type: 'checkListItem',
        attrs: { checked: false },
        content: [{ type: 'text', text: 'Plan team building event' }],
      },
    ],
    metadata: {
      title: 'Meeting Notes',
      tags: ['work', 'meetings'],
      folder: 'work/meetings',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T11:30:00Z',
    },
  },
];

async function runTests() {
  console.log('🧪 Testing Queue Markdown Conversion\n');

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log('='.repeat(50));

    try {
      const markdown = await convertBlocksToMarkdown(
        testCase.blocks,
        testCase.metadata
      );
      console.log('✅ Conversion successful');
      console.log('📄 Generated Markdown:');
      console.log(markdown);

      // Basic validation
      if (markdown.length > 0) {
        console.log('✅ Markdown is not empty');
      } else {
        console.log('❌ Markdown is empty');
      }

      // Check for metadata if expected
      if (testCase.metadata && markdown.includes('---')) {
        console.log('✅ Metadata header found');
      } else if (testCase.metadata) {
        console.log('❌ Metadata header missing');
      }
    } catch (error) {
      console.error('❌ Conversion failed:', error.message);
    }

    console.log('\n' + '-'.repeat(50) + '\n');
  }

  console.log('🎉 All tests completed!');
}

// Run the tests
runTests().catch(console.error);
