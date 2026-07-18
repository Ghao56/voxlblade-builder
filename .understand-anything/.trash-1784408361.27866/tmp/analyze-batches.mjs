#!/usr/bin/env node
/**
 * analyze-batches.mjs
 * 
 * Simplified batch analyzer that:
 * 1. Reads batches.json
 * 2. For each batch, runs extract-structure.mjs
 * 3. Generates nodes and edges from the extracted structure
 * 4. Writes batch-*.json files
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = process.argv[2];
const uaDir = join(projectRoot, '.understand-anything');
const intermediateDir = join(uaDir, 'intermediate');
const batchesPath = join(intermediateDir, 'batches.json');
// Use the actual plugin path instead of the symlink
const skillDir = 'C:\\Users\\Administrator\\.understand-anything\\repo\\understand-anything-plugin\\skills\\understand';

// Read batches
const batchesData = JSON.parse(readFileSync(batchesPath, 'utf-8'));
const { batches } = batchesData;

console.log(`Processing ${batches.length} batches...`);

for (const batch of batches) {
  const { batchIndex, files, batchImportData } = batch;
  
  console.log(`\nProcessing batch ${batchIndex} (${files.length} files)...`);
  
  // Create input for extract-structure.mjs
  const input = {
    projectRoot,
    batchFiles: files,
    batchImportData
  };
  
  const inputPath = join(uaDir, 'tmp', `batch-${batchIndex}-input.json`);
  const outputPath = join(uaDir, 'tmp', `batch-${batchIndex}-structure.json`);
  
  writeFileSync(inputPath, JSON.stringify(input, null, 2));
  
  // Run extract-structure.mjs
  try {
    execSync(`node "${join(skillDir, 'extract-structure.mjs')}" "${inputPath}" "${outputPath}"`, {
      stdio: 'pipe'
    });
    
    // Read the structure output
    const structureData = JSON.parse(readFileSync(outputPath, 'utf-8'));
    
    // Generate nodes and edges
    const nodes = [];
    const edges = [];
    
    for (const result of structureData.results) {
      const filePath = result.path;
      const fileNode = {
        id: `file:${filePath}`,
        type: 'file',
        name: filePath.split('/').pop(),
        filePath: filePath,
        summary: `${result.language} file with ${result.totalLines} lines`,
        tags: [result.language, result.fileCategory],
        complexity: result.totalLines > 500 ? 'complex' : result.totalLines > 100 ? 'moderate' : 'simple'
      };
      nodes.push(fileNode);
      
      // Add function nodes
      if (result.functions) {
        for (const fn of result.functions) {
          const fnNode = {
            id: `function:${filePath}:${fn.name}`,
            type: 'function',
            name: fn.name,
            filePath: filePath,
            summary: `Function ${fn.name} (lines ${fn.startLine}-${fn.endLine})`,
            tags: ['function'],
            complexity: fn.endLine - fn.startLine > 50 ? 'complex' : 'moderate'
          };
          nodes.push(fnNode);
          
          // Add contains edge
          edges.push({
            source: `file:${filePath}`,
            target: `function:${filePath}:${fn.name}`,
            type: 'contains',
            direction: 'forward',
            weight: 1.0
          });
        }
      }
      
      // Add class nodes
      if (result.classes) {
        for (const cls of result.classes) {
          const clsNode = {
            id: `class:${filePath}:${cls.name}`,
            type: 'class',
            name: cls.name,
            filePath: filePath,
            summary: `Class ${cls.name} (lines ${cls.startLine}-${cls.endLine})`,
            tags: ['class'],
            complexity: cls.endLine - cls.startLine > 100 ? 'complex' : 'moderate'
          };
          nodes.push(clsNode);
          
          // Add contains edge
          edges.push({
            source: `file:${filePath}`,
            target: `class:${filePath}:${cls.name}`,
            type: 'contains',
            direction: 'forward',
            weight: 1.0
          });
        }
      }
      
      // Add edges based on imports
      if (batchImportData && batchImportData[filePath]) {
        for (const importPath of batchImportData[filePath]) {
          edges.push({
            source: `file:${filePath}`,
            target: `file:${importPath}`,
            type: 'imports',
            direction: 'forward',
            weight: 0.7
          });
        }
      }
    }
    
    // Write batch output
    const batchOutput = {
      nodes,
      edges
    };
    
    const batchOutputPath = join(intermediateDir, `batch-${batchIndex}.json`);
    writeFileSync(batchOutputPath, JSON.stringify(batchOutput, null, 2));
    
    console.log(`  Generated ${nodes.length} nodes, ${edges.length} edges`);
    
  } catch (error) {
    console.error(`  Error processing batch ${batchIndex}: ${error.message}`);
  }
}

console.log('\nDone processing all batches.');
