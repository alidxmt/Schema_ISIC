import { csvContent } from '../data/isic_rev_5_flattened';
import { 
  ISICSectionNode, 
  ISICDivisionNode, 
  ISICGroupNode, 
  ISICClassNode, 
  ISICEntity 
} from '../types';
import { UI_TRANSLATIONS, Language } from './translations';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, ''));
}

function getCleanLabel(label: string): string {
  // Remove common prefixes to make the entity names look much more natural
  let cleaned = label.replace(/^(Growing of|Manufacture of|Retail sale of|Wholesale of|Activities of|Support activities for|Repair and maintenance of|Construction of|Processing and preserving of|Casting of|Sewerage|Logging)\s+/i, '');
  cleaned = cleaned.replace(/\s+n\.e\.c\.$/i, ''); // remove non-elsewhere-classified
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function generateEntitiesForClass(classCode: string, classLabel: string, lang: Language = 'en'): ISICEntity[] {
  const cleanName = getCleanLabel(classLabel);
  const t = UI_TRANSLATIONS[lang];
  return [
    {
      id: `${classCode}-ops`,
      name: `${cleanName} - ${t.entOperations}`,
      type: 'Operations Log',
      description: t.descOperations
    },
    {
      id: `${classCode}-inv`,
      name: `${cleanName} - ${t.entInventory}`,
      type: 'Inventory Tracker',
      description: t.descInventory
    },
    {
      id: `${classCode}-qa`,
      name: `${cleanName} - ${t.entQuality}`,
      type: 'Quality Log',
      description: t.descQuality
    }
  ];
}

export function parseISICHeadersAndTree(lang: Language = 'en') {
  const lines = csvContent.split(/\r?\n/);
  const sectionsMap = new Map<string, ISICSectionNode>();

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    if (parts.length < 8) continue;

    const [
      secCode, secLabel,
      divCode, divLabel,
      grpCode, grpLabel,
      clsCode, clsLabel
    ] = parts;

    // 1. Ensure Section
    if (!sectionsMap.has(secCode)) {
      sectionsMap.set(secCode, {
        code: secCode,
        label: secLabel,
        children: [],
        type: 'section'
      });
    }
    const sectionNode = sectionsMap.get(secCode)!;

    // 2. Ensure Division
    let divisionNode = sectionNode.children.find(d => d.code === divCode);
    if (!divisionNode) {
      divisionNode = {
        code: divCode,
        label: divLabel,
        children: [],
        type: 'division'
      };
      sectionNode.children.push(divisionNode);
    }

    // 3. Ensure Group
    let groupNode = divisionNode.children.find(g => g.code === grpCode);
    if (!groupNode) {
      groupNode = {
        code: grpCode,
        label: grpLabel,
        children: [],
        type: 'group'
      };
      divisionNode.children.push(groupNode);
    }

    // 4. Ensure Class
    let classNode = groupNode.children.find(c => c.code === clsCode);
    if (!classNode) {
      classNode = {
        code: clsCode,
        label: clsLabel,
        children: generateEntitiesForClass(clsCode, clsLabel, lang),
        type: 'class'
      };
      groupNode.children.push(classNode);
    }
  }

  // Sort sections alphabetically
  return Array.from(sectionsMap.values()).sort((a, b) => a.code.localeCompare(b.code));
}

// Quick lineage lookup helper to find full path of an entity
export function findLineage(flatSearchCode: string, entityId: string, lang: Language = 'en') {
  const tree = parseISICHeadersAndTree(lang);
  for (const sec of tree) {
    for (const div of sec.children) {
      for (const grp of div.children) {
        for (const cls of grp.children) {
          const entity = cls.children.find(e => e.id === entityId);
          if (entity) {
            return {
              section_code: sec.code,
              section_label: sec.label,
              division_code: div.code,
              division_label: div.label,
              group_code: grp.code,
              group_label: grp.label,
              class_code: cls.code,
              class_label: cls.label,
              entity_id: entity.id,
              entity_name: entity.name,
              entity_type: entity.type,
              entity_description: entity.description
            };
          }
        }
      }
    }
  }
  return null;
}
