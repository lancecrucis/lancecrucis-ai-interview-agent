import curriculumData from './curriculum.json';

export const modules = curriculumData.modules;
export const days = curriculumData.days;

export function getDayById(dayNum) {
  return days.find(d => d.day === dayNum);
}

export function getModuleForDay(dayNum) {
  return modules.find(m => m.days.includes(dayNum));
}

export function getDaysForModule(moduleNum) {
  const mod = modules.find(m => m.n === moduleNum);
  if (!mod) return [];
  return days.filter(d => mod.days.includes(d.day));
}
