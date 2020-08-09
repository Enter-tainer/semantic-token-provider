import visit = require('unist-util-visit')
import unified = require('unified')

module.exports = () => {
  return (tree: any) => {
    visit(tree, 'element', visitor)
  }

  function visitor(node: any, index: any, parent: any) {
    if (!parent || parent.tagName !== 'pre' || node.tagName !== 'code') {
      return;
    }
    const lang = getLanguage(node);
    if (lang === null) {
      return;
    }
  }
}

function getLanguage(node: any) {
  const className = node.properties.className || [];

  for (const classListItem of className) {
    if (classListItem.slice(0, 9) === 'language-') {
      return classListItem.slice(9).toLowerCase();
    }
  }

  return null;
}
