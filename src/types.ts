export interface FieldDefinition {
  fieldName: string;
  dataType: string;
  description: string;
  exampleValue: string;
  constraints: string;
}

export interface SchemaSpecification {
  entityName: string;
  isicClass: string;
  isicCode: string;
  divisionLabel: string;
  classLabel: string;
  architectureNotes: string;
  fields: FieldDefinition[];
}

export interface ISICEntity {
  id: string; // class_code + entity_index
  name: string;
  type: 'Operations Log' | 'Inventory Tracker' | 'Quality Log';
  description: string;
}

export interface ISICClassNode {
  code: string;
  label: string;
  children: ISICEntity[];
  type: 'class';
}

export interface ISICGroupNode {
  code: string;
  label: string;
  children: ISICClassNode[];
  type: 'group';
}

export interface ISICDivisionNode {
  code: string;
  label: string;
  children: ISICGroupNode[];
  type: 'division';
}

export interface ISICSectionNode {
  code: string;
  label: string;
  children: ISICDivisionNode[];
  type: 'section';
}

export interface Lineage {
  section_code: string;
  section_label: string;
  division_code: string;
  division_label: string;
  group_code: string;
  group_label: string;
  class_code: string;
  class_label: string;
  entity_id: string;
  entity_name: string;
}
