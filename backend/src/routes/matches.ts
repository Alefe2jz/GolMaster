import { Router } from 'express'
import { apiFootball } from '../services/apiFootball'
import { ApiFootballResponse } from "../types/apiFootball"

const router = Router()

router.get("/mock", (req, res) => {
  return res.json([
    {
      id: 1,
      home: "Brasil",
      away: "Alemanha",
      date: "2026-06-15T18:00:00Z",
      stadium: "MetLife Stadium",
      city: "New Jersey"
    }
  ]);
});
export default router
