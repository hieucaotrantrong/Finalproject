"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bannerController_1 = require("../controllers/bannerController");
const router = (0, express_1.Router)();
/*----------------------------------*/
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/*----------------------------------*/
router.get("/", asyncHandler(bannerController_1.getBanners));
router.post("/", asyncHandler(bannerController_1.createBanner));
router.delete("/:id", asyncHandler(bannerController_1.deleteBanner));
router.put("/:id", asyncHandler(bannerController_1.updateBanner));
exports.default = router;
