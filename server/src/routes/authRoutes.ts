import { Router } from 'express';
import authController from '../controllers/authController';
import { auth } from '../types/auth';

const router = Router();

/* ---------------------------------------------------
  
---------------------------------------------------- */
const asyncHandler = (fn: any) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/*----------------------------------
Register Router
-----------------------------------*/
router.post('/signup', asyncHandler(authController.signup));

/*----------------------------------
Login Router
-----------------------------------*/
router.post('/login', asyncHandler(authController.login));

/*----------------------------------
Google Login Router
-----------------------------------*/
router.post('/google', asyncHandler(authController.googleLogin));
/*----------------------------------
GitHub Login Router
-----------------------------------*/
router.get('/github', asyncHandler(authController.githubAuth));

router.get('/github/callback', asyncHandler(authController.githubLogin));

/*----------------------------------
Profile Routes
-----------------------------------*/
router.get('/profile', auth, asyncHandler(authController.getProfile));

router.put('/profile', auth, asyncHandler(authController.updateProfile));

router.put('/change-password', auth, asyncHandler(authController.changePassword));

export default router;