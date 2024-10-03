import { createCopyright, getCopyrightById } from '../services/copyrightService';

export const createCopyrightHandler = async (req, res) => {
  try {
    const copyright = await createCopyright(req.body);
    res.status(201).json(copyright);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCopyrightHandler = async (req, res) => {
  try {
    const copyright = await getCopyrightById(req.params.id);
    if (copyright) {
      res.status(200).json(copyright);
    } else {
      res.status(404).json({ error: 'Copyright not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add more controller functions as needed