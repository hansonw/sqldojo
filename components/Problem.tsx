import React from "react";
import Router from "next/router";
import ReactMarkdown from "react-markdown";
import { Problem as ProblemModel } from "@prisma/client";

const Problem: React.FC<{ problem: ProblemModel }> = ({ problem }) => {
  return (
    <div onClick={() => Router.push("/p/[id]", `/p/${problem.id}`)}>
      <h2>{problem.name}</h2>
      <ReactMarkdown children={problem.description} />
      <style jsx>{`
        div {
          color: inherit;
          padding: 2rem;
        }
      `}</style>
    </div>
  );
};

export default Problem;
