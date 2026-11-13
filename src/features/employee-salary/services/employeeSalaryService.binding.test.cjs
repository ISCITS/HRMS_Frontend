const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'employeeSalaryService.ts'), 'utf8');
function service(api) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (name) => {
    if (name.includes('MasterApiService')) return { masterApiService: api };
    if (name.includes('lookupLabel')) return { resolveLookupDisplayLabel: ({ strDisplayName }) => strDisplayName };
    throw new Error(name);
  }});
  return exports.employeeSalaryService;
}
const option = { intID: '12', strLabel: 'Manager' };
const collections = { lstDesignations: [option], lstDepartments: [option], lstGrades: [option] };
test('binds all salary lookup collections and normalizes IDs', async () => {
  const result = await service({ getEmployeeSalaryFormOptions: async () => ({ Data: { ...collections, lstSalaryStructures: [] } }) }).getFormOptions();
  for (const key of Object.keys(collections)) {
    assert.equal(result[key][0].intID, 12);
    assert.equal(result[key][0].strLabel, 'Manager');
  }
});
test('uses employee master collections when salary response omits them', async () => {
  const result = await service({ getEmployeeSalaryFormOptions: async () => ({ Data: { lstSalaryStructures: [] } }), getEmployeeFormOptions: async () => ({ Data: collections }) }).getFormOptions();
  assert.equal(result.lstDesignations.length, 1);
  assert.equal(result.lstDepartments.length, 1);
  assert.equal(result.lstGrades.length, 1);
});
test('preserves intentionally empty collections without fetching other masters', async () => {
  const result = await service({ getEmployeeSalaryFormOptions: async () => ({ Data: { lstDesignations: [], lstDepartments: [], lstGrades: [], lstSalaryStructures: [] } }) }).getFormOptions();
  assert.equal(result.lstGrades.length, 0);
});
test('propagates loading errors instead of returning empty lists', async () => {
  await assert.rejects(service({ getEmployeeSalaryFormOptions: async () => { throw new Error('Load failed'); } }).getFormOptions(), /Load failed/);
});
