"""
evaluation.py

Defines an EvaluationProtocol class which measures:
- Docs Precision
- Pages Precision
- Cosine similarity
- Hallucination measure
- Overall 0-5 rating

In reality, you must define how you measure these.
Here we provide placeholders for demonstration.
"""

import math
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class EvaluationProtocol:
    def __init__(self):
        """
        You might store config here, like threshold for 'hallucination', etc.
        """
        pass

    def evaluate_answer(
        self,
        answer: str,
        ground_truth_docs: list,
        predicted_docs: list,
        embeddings_fn=None
    ) -> dict:
        """
        Evaluate a single answer with various metrics:
         - Docs Precision (did we match the correct docs?)
         - Pages Precision
         - Cosine similarity of final answer's embedding (optional)
         - Hallucination measure
         - Overall 0-5 rating

        :param answer: The final string answer from the LLM.
        :param ground_truth_docs: The set/list of docs that should have been used or contain the correct info.
        :param predicted_docs: The docs the chatbot actually used or cited in the answer.
        :param embeddings_fn: optional function to get embeddings if you want a semantic measure.
        :return: A dict of metrics.
        """
        # 1) Docs Precision
        docs_precision = self.compute_docs_precision(ground_truth_docs, predicted_docs)

        # 2) Pages Precision
        pages_precision = self.compute_pages_precision(ground_truth_docs, predicted_docs)

        # 3) Cosine Similarity to "ideal" or "ground truth" answer (if you have a reference text).
        #    We'll do a dummy example if embeddings_fn is given
        cosine_sim = self.compute_cosine_similarity(answer, embeddings_fn)

        # 4) Hallucination measure (stub)
        hallucination_score = self.compute_hallucination_score(answer, ground_truth_docs)

        # 5) Overall rating
        overall = self.compute_overall_rating(
            docs_precision, 
            pages_precision, 
            hallucination_score
        )

        return {
            "docs_precision": docs_precision,
            "pages_precision": pages_precision,
            "cosine_similarity": cosine_sim,
            "hallucination_score": hallucination_score,
            "overall_eval_0_5": overall
        }

    def compute_docs_precision(self, ground_truth_docs, predicted_docs) -> float:
        """
        Example stub:
        If predicted_docs is a subset or partial overlap with ground_truth_docs,
        measure ratio. Real logic depends on doc identifiers, etc.
        """
        if not ground_truth_docs:
            return 1.0 if not predicted_docs else 0.0

        ground_ids = set(d["id"] for d in ground_truth_docs)
        pred_ids = set(d["id"] for d in predicted_docs)
        intersection = ground_ids.intersection(pred_ids)
        precision = len(intersection) / len(pred_ids) if pred_ids else 0.0
        return round(precision, 2)

    def compute_pages_precision(self, ground_truth_docs, predicted_docs) -> float:
        """
        Another doc-based metric, maybe you compare page numbers or chunk indices.
        Stub: we'll do the same as docs precision for demonstration.
        """
        return self.compute_docs_precision(ground_truth_docs, predicted_docs)

    def compute_cosine_similarity(self, answer: str, embeddings_fn) -> float:
        """
        If you have a function to embed text, e.g. 'embeddings_fn(answer) -> vector',
        you can compare it to a reference. For now we just return a random example.
        """
        if embeddings_fn is None:
            return 0.0  # no measure
        # example: compare answer to some "ideal" reference
        # left_vec = embeddings_fn(answer)
        # right_vec = embeddings_fn(ideal_answer)
        # compute cos sim
        # For now just mock:
        return 0.85  # pretend we got 0.85

    def compute_hallucination_score(self, answer: str, ground_truth_docs: list) -> float:
        """
        Possibly parse the answer for references or named entities 
        and see if they appear in ground_truth_docs. 
        The higher the mismatch, the higher the hallucination.
        For demonstration, we do a random approach.
        """
        # e.g. if answer references doc/page not in ground_truth_docs => hallucination
        # We'll stub out a random measure: [0..1]
        return 0.2  # 0 => no hallucination, 1 => severe hallucination

    def compute_overall_rating(
        self, docs_precision, pages_precision, hallucination_score
    ) -> float:
        """
        Combine metrics into a 0-5 rating. 
        This is highly subjective. We'll do a simple formula for demonstration:
        """
        # invert hallucination so 0.0 => good
        # scale it so that 1.0 => 0 points
        # also scale precision so 1.0 => 5 points 
        # This is arbitrary!
        doc_page_avg = (docs_precision + pages_precision) / 2.0
        hallucination_penalty = 1.0 - hallucination_score
        raw_score = doc_page_avg * 5.0 * hallucination_penalty
        # clamp to [0..5]
        final = min(max(raw_score, 0.0), 5.0)
        return round(final, 2)
