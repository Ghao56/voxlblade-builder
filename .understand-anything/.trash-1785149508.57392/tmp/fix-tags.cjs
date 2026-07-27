const fs = require('fs');
const graph = JSON.parse(fs.readFileSync('.understand-anything/intermediate/assembled-graph.json', 'utf8'));

// Fix missing tags
graph.nodes.forEach(n => {
  if (!n.tags || n.tags.length === 0) {
    // Generate tags based on type and path
    const tags = [];
    if (n.type === 'file') {
      if (n.filePath) {
        if (n.filePath.endsWith('.svelte')) tags.push('svelte', 'ui');
        else if (n.filePath.endsWith('.ts')) tags.push('typescript');
        else if (n.filePath.endsWith('.json')) tags.push('json', 'data');
        else if (n.filePath.endsWith('.html')) tags.push('html', 'markup');
        else if (n.filePath.endsWith('.css')) tags.push('css', 'styles');
        else if (n.filePath.endsWith('.yml') || n.filePath.endsWith('.yaml')) tags.push('yaml', 'config');
        else if (n.filePath.endsWith('.md')) tags.push('markdown', 'docs');
        
        if (n.filePath.includes('/engine/')) tags.push('engine');
        else if (n.filePath.includes('/data/')) tags.push('data');
        else if (n.filePath.includes('/constants/')) tags.push('constants');
        else if (n.filePath.includes('/modals/')) tags.push('modal');
        else if (n.filePath.includes('/ui/')) tags.push('component');
        else if (n.filePath.includes('/lib/')) tags.push('library');
      }
    } else if (n.type === 'function') {
      tags.push('function');
    } else if (n.type === 'config') {
      tags.push('config');
    } else if (n.type === 'schema') {
      tags.push('schema', 'data');
    } else if (n.type === 'document') {
      tags.push('docs');
    } else if (n.type === 'pipeline') {
      tags.push('ci-cd', 'pipeline');
    }
    
    if (tags.length === 0) tags.push('untagged');
    n.tags = tags;
  }
});

fs.writeFileSync('.understand-anything/intermediate/assembled-graph.json', JSON.stringify(graph, null, 2));
console.log(`Fixed tags on ${graph.nodes.filter(n => n.tags.length > 0).length} nodes`);