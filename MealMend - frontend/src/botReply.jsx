
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./BotReply.css";

export default function BotReply({ reply = "" }) {
  const content = typeof reply === "string" ? reply : "";

  const isRecipe =
    /meal name|ingredients|preparation steps|simple preparation steps/i.test(
      content
    );

  return (
    <div className={`bot-reply ${isRecipe ? "recipe-reply" : ""}`}>
      {isRecipe && (
        <div className="recipe-topline">
          <span className="recipe-icon">🍅</span>
          <div>
            <span className="recipe-eyebrow">MEALMEND SUGGESTS</span>
            <div className="recipe-subtitle">
              A little less waste, a better meal.
            </div>
          </div>
        </div>
      )}

      <div className="bot-reply-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h2 className="reply-title">{children}</h2>
            ),
            h2: ({ children }) => (
              <h3 className="reply-heading">{children}</h3>
            ),
            h3: ({ children }) => (
              <h4 className="reply-subheading">{children}</h4>
            ),
            h4: ({ children }) => (
              <h4 className="reply-subheading">{children}</h4>
            ),
            ul: ({ children }) => (
              <ul className="reply-list">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="reply-steps">{children}</ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            p: ({ children }) => (
              <p className="reply-paragraph">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="reply-strong">{children}</strong>
            ),
            hr: () => <hr className="reply-divider" />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
