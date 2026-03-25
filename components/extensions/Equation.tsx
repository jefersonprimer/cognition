"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import katex from "katex";

function EquationView({ node }: NodeViewProps) {
    const latex = String(node.attrs.latex || "");

    let html = "";
    try {
        html = katex.renderToString(latex, {
            output: "html",
            strict: "ignore",
            throwOnError: false,
        });
    } catch {
        html = "";
    }

    return (
        <NodeViewWrapper
            as="span"
            contentEditable={false}
            data-type="equation"
            data-latex={latex}
            className="equation-node"
        >
            {html ? (
                <span dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
                <span className="equation-node-fallback">{latex}</span>
            )}
        </NodeViewWrapper>
    );
}

const Equation = Node.create({
    name: "equation",
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,

    addAttributes() {
        return {
            latex: {
                default: "",
                parseHTML: (element: HTMLElement) => element.getAttribute("data-latex") || element.textContent || "",
                renderHTML: (attributes: Record<string, string>) => ({
                    "data-latex": attributes.latex,
                }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-type="equation"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        const latex = String(HTMLAttributes["data-latex"] || "");
        return ["span", mergeAttributes({ "data-type": "equation" }, HTMLAttributes), latex];
    },

    addNodeView() {
        return ReactNodeViewRenderer(EquationView);
    },
});

export default Equation;
