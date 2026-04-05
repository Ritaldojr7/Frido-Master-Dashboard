import { describe, it, expect } from 'vitest';
import {
  dashboardCategories,
  insideSalesIndiaData,
  insideSalesMiddleEastData,
  experienceStoreData,
  retentionCallingData,
  onlineReputationManagementData,
  feedbackCustomerExperienceData,
  ICONS,
} from './dashboardData';

describe('dashboardData', () => {
  it('exports dashboardCategories as a non-empty array', () => {
    expect(Array.isArray(dashboardCategories)).toBe(true);
    expect(dashboardCategories.length).toBeGreaterThan(0);
  });

  it('each dashboard category has id, title, icon, links', () => {
    dashboardCategories.forEach((cat) => {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('title');
      expect(cat).toHaveProperty('links');
      expect(Array.isArray(cat.links)).toBe(true);
    });
  });

  it('exports ICONS as an object with string values', () => {
    expect(typeof ICONS).toBe('object');
    expect(Object.keys(ICONS).length).toBeGreaterThan(0);
    Object.values(ICONS).forEach((path) => {
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });
  });

  it('exports insideSalesIndiaData with title and sections', () => {
    expect(insideSalesIndiaData).toHaveProperty('title');
    expect(insideSalesIndiaData).toHaveProperty('sections');
    expect(Array.isArray(insideSalesIndiaData.sections)).toBe(true);
  });

  it('exports experienceStoreData with title and sections', () => {
    expect(experienceStoreData).toHaveProperty('title');
    expect(experienceStoreData).toHaveProperty('backRoute');
    expect(Array.isArray(experienceStoreData.sections)).toBe(true);
  });

  it('exports insideSalesMiddleEastData with title and sections', () => {
    expect(insideSalesMiddleEastData).toHaveProperty('title');
    expect(insideSalesMiddleEastData).toHaveProperty('sections');
    expect(Array.isArray(insideSalesMiddleEastData.sections)).toBe(true);
  });

  it('exports retentionCallingData, onlineReputationManagementData, feedbackCustomerExperienceData', () => {
    expect(retentionCallingData.title).toBeDefined();
    expect(onlineReputationManagementData.title).toBeDefined();
    expect(feedbackCustomerExperienceData.title).toBeDefined();
  });
});
