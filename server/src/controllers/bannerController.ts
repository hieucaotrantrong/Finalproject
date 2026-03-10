import { Request, Response } from "express";
import pool from "../config/database";

/*----------------------------------*/
export const getBanners = async (req: Request, res: Response) => {

  const result = await pool.query(
    "SELECT * FROM banners ORDER BY id ASC"
  );

  res.json(result.rows);
};

/*----------------------------------*/
export const createBanner = async (req: Request, res: Response) => {

  const { image_url } = req.body;

  const result = await pool.query(
    "INSERT INTO banners (image_url) VALUES ($1) RETURNING *",
    [image_url]
  );

  res.json(result.rows[0]);
};

/*----------------------------------*/
export const deleteBanner = async (req: Request, res: Response) => {

  const { id } = req.params;

  await pool.query(
    "DELETE FROM banners WHERE id = $1",
    [id]
  );

  res.json({ message: "Banner deleted" });
};

/*----------------------------------*/
export const updateBanner = async (req: Request, res: Response) => {

  const { id } = req.params;
  const { image_url } = req.body;

  const result = await pool.query(
    "UPDATE banners SET image_url = $1 WHERE id = $2 RETURNING *",
    [image_url, id]
  );

  res.json(result.rows[0]);
};