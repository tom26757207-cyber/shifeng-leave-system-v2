export const sampleCase1 = `# 三代簡單家庭（驗收測試案例 1）
person P1 { name: 王大明; gender: male; age: 78; role: 案主; generation: 2 }
person P2 { name: 案妻; gender: female; age: 75; role: 主要照顧者; generation: 2 }
person P3 { name: 長子; gender: male; age: 50; generation: 3 }
person P4 { name: 次女; gender: female; age: 48; generation: 3 }
marriage P1 P2
children parents: [P1, P2] kids: [P3, P4]
household [P1, P2]
caregiver from: P2 to: P1 burden: moderate
primary_contact P3
support_level family: good
economic_status family: stable
`;

export const sampleCase2 = `# 含已逝者與離婚（驗收測試案例 2）
person P1 { name: 案主; gender: male; age: 65; role: 案主; generation: 2 }
person P2 { name: 前妻; gender: female; generation: 2 }
person P3 { name: 案父; gender: male; generation: 1; deceased: true; death_year: 2015 }
person P4 { name: 案母; gender: female; age: 88; generation: 1 }
marriage P3 P4
divorce P1 P2
children parents: [P3, P4] kids: [P1]
`;
