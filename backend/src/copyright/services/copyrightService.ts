import Copyright from '../models/copyrightModel';

export const createCopyright = async (data) => {
  try {
    const copyright = await Copyright.create(data);
    return copyright;
  } catch (error) {
    throw new Error('Error creating copyright');
  }
};

export const getCopyrightById = async (id) => {
  try {
    const copyright = await Copyright.findByPk(id);
    return copyright;
  } catch (error) {
    throw new Error('Error fetching copyright');
  }
};

// Add more service functions as needed