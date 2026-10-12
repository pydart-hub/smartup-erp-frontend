const fs = require('fs');
const filePath = 'src/app/dashboard/branch-manager/attendance/staff/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldInInput = `<input
                                      type="time"
                                      value={sess.in_time || ""}
                                      onChange={(e) =>
                                        handleSessionChange(emp.name, sess.id, "in_time", e.target.value, emp.isVisiting)
                                      }
                                      className="h-5 px-1 border-0 bg-transparent text-text-primary text-[11px] flex-1 min-w-[50px] outline-none"
                                    />`;

const newInInput = `<Time12Input
                                      value={sess.in_time || ""}
                                      onChange={(val) =>
                                        handleSessionChange(emp.name, sess.id, "in_time", val, emp.isVisiting)
                                      }
                                      size="sm"
                                      className="border-0 bg-transparent px-0 py-0"
                                    />`;

const oldOutInput = `<input
                                      type="time"
                                      value={sess.out_time || ""}
                                      onChange={(e) =>
                                        handleSessionChange(emp.name, sess.id, "out_time", e.target.value, emp.isVisiting)
                                      }
                                      className="h-5 px-1 border-0 bg-transparent text-text-primary text-[11px] flex-1 min-w-[50px] outline-none"
                                    />`;

const newOutInput = `<Time12Input
                                      value={sess.out_time || ""}
                                      onChange={(val) =>
                                        handleSessionChange(emp.name, sess.id, "out_time", val, emp.isVisiting)
                                      }
                                      size="sm"
                                      className="border-0 bg-transparent px-0 py-0"
                                    />`;

let updated = content.replace(oldInInput, newInInput);
updated = updated.replace(oldOutInput, newOutInput);

if (updated !== content) {
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully replaced in_time and out_time inputs');
} else {
  console.log('Could not find exact patterns to replace');
}
