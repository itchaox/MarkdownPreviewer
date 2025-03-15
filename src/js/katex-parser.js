import katex from 'katex';

export default markdownItKatexPlugin;

function markdownItKatexPlugin(md, delimiters) {
    delimiters = delimiters || [
        { left: '$', right: '$', display: false },
        { left: '$$', right: '$$', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
    ];

    function renderKatex(math, displayMode) {
        try {
            return katex.renderToString(math, { throwOnError: false, displayMode });
        } catch (err) {
            return math;
        }
    }

    function inlineMath(state, silent) {
        for (let delim of delimiters) {
            let start = state.src.indexOf(delim.left, state.pos);
            if (start !== state.pos) continue;
            
            let end = state.src.indexOf(delim.right, start + delim.left.length);
            if (end === -1) continue;
            
            let content = state.src.slice(start + delim.left.length, end);
            if (!content.trim()) continue;
            
            if (!silent) {
                let token = state.push('math', 'math', 0);
                token.content = content;
                token.markup = delim.left;
                token.block = delim.display;
            }
            
            state.pos = end + delim.right.length;
            return true;
        }
        return false;
    }

    function mathRenderer(tokens, idx) {
        let token = tokens[idx];
        return renderKatex(token.content, token.block);
    }

    md.inline.ruler.before('escape', 'math', inlineMath);
    md.renderer.rules.math = mathRenderer;
};
