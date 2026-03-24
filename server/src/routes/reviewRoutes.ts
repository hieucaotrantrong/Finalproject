import express from "express";
import { createReview, getReviews, canReview } from "../controllers/reviewController";
import { auth } from "../types/auth";

const router = express.Router();

const asyncHandler = (fn: any) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

router.post("/", auth, asyncHandler(createReview));
router.get("/can-review", auth, asyncHandler(canReview));
router.get("/:productId", asyncHandler(getReviews));

export default router;