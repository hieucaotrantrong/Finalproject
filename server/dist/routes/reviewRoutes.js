"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reviewController_1 = require("../controllers/reviewController");
const auth_1 = require("../types/auth");
const router = express_1.default.Router();
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
router.post("/", auth_1.auth, asyncHandler(reviewController_1.createReview));
router.get("/can-review", auth_1.auth, asyncHandler(reviewController_1.canReview));
router.get("/:productId", asyncHandler(reviewController_1.getReviews));
exports.default = router;
