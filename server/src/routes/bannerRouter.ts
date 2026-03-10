import { Router } from "express";
import {
  getBanners,
  createBanner,
  deleteBanner,
  updateBanner
} from "../controllers/bannerController";

const router = Router();

/*----------------------------------*/
const asyncHandler = (fn: any) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/*----------------------------------*/
router.get("/", asyncHandler(getBanners));
router.post("/", asyncHandler(createBanner));
router.delete("/:id", asyncHandler(deleteBanner));
router.put("/:id", asyncHandler(updateBanner));

export default router;