import { ProblemQuery, ProblemSubmission } from "@prisma/client";

export enum AnswerState {
  Waiting,
  Correct,
  Incorrect,
  Error,
}

export type QueryResult =
  | {
      rows: undefined;
      columns: undefined;
      solutionColumns: undefined;
      count: undefined;
      error: string;
    }
  | {
      rows: any[];
      columns: string[];
      solutionColumns: string[];
      count: number;
      error: undefined;
    };

export class QueryStore {
  id: string;
  query: string;
  problemId: string;

  _hideResult: boolean = false;
  _resultCache: Promise<QueryResult> | null;
  _answerState: Promise<AnswerState> | null;

  constructor(id: string, query: string, problemId: string) {
    this.id = id;
    this.query = query;
    this.problemId = problemId;
  }

  static fromSubmission(submission: ProblemSubmission): QueryStore {
    const res = new QueryStore(
      submission.id,
      submission.query,
      submission.problemId
    );
    res._hideResult = true;
    res._answerState = Promise.resolve(
      submission.correct ? AnswerState.Correct : AnswerState.Incorrect
    );
    return res;
  }

  static fromProblemQuery(submission: ProblemQuery): QueryStore {
    const res = new QueryStore(
      submission.id,
      submission.query,
      submission.problemId
    );
    res._hideResult = true;
    return res;
  }

  getResults(): Promise<QueryResult> {
    if (this._resultCache != null) {
      return this._resultCache;
    }
    this._resultCache = fetch(`/api/problem/${this.problemId}/query`, {
      body: this.query,
      method: "POST",
    })
      .then((res) => res.json())
      .catch((err) => ({ error: String(err) }));
    return this._resultCache;
  }

  verify(): Promise<AnswerState> {
    if (this._answerState) {
      return this._answerState;
    }
    this._answerState = fetch(`/api/problem/${this.problemId}/verify`, {
      body: this.query,
      method: "POST",
    })
      .then((response) => response.json())
      .catch((err) => ({ error: String(err) }))
      .then((data) => {
        if (data.error) {
          console.error(data.error);
          return AnswerState.Error;
        }
        return data.correct ? AnswerState.Correct : AnswerState.Incorrect;
      });
    return this._answerState;
  }
}
