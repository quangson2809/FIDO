import assert from 'node:assert/strict';
import type { ProductAttributeValueDto, ProductFamilyDto, ProductFamilyMemberDto } from '../src/features/catalog/types';
import { isColorOrSize, familyAttributes, matchingFamilyMembers, memberSelection, memberIsPurchasable,
  resolveSelectedMember, changeFamilySelection, optionIsAvailable } from '../src/features/catalog/model/productFamilySelection';

const value = (attribute: number, code: string, option: number, label: string): ProductAttributeValueDto => ({
  attribute_id: attribute, attribute_code: code, attribute_name: code,
  attribute_value_id: option, value: label, label, is_variant_defining: true, sort_order: attribute,
});
const color = (option: number, label: string) => value(1, 'COLOR', option, label);
const size = (option: number, label: string) => value(2, 'SIZE', option, label);
const member = (id: number, values: ProductAttributeValueDto[], quantity = 3): ProductFamilyMemberDto => ({
  product_id: id, parent_product_id: id === 1 ? null : 1, sku: 'SKU-' + id, name: 'Product ' + id,
  selling_price: 100000 + id, status: 'ACTIVE', images: [], attribute_values: values,
  available_quantity: quantity, purchasable: quantity > 0,
});
for (const sizes of [['S', 'M', 'L'], ['28', '30', '32'], ['39', '40', '42']]) {
  const family: ProductFamilyDto = { root_product_id: 1, members: sizes.map((label, i) =>
    member(i + 1, [color(11, 'Black'), size(20 + i, label), value(3, 'MATERIAL', 31, 'Cotton')])) };
  assert.deepEqual(familyAttributes(family.members).map(a => a.attribute_id), [1, 2], 'descriptive attributes never become selectors');
  assert.deepEqual(familyAttributes(family.members)[1].options.map(o => o.label), sizes,
    'show only the sizes assigned to this product family');
  assert.equal(resolveSelectedMember(family, { 1: 11 }), undefined);
  for (let i = 0; i < sizes.length; i++)
    assert.equal(resolveSelectedMember(family, { 1: 11, 2: 20 + i })?.product_id, i + 1);
  assert.equal(resolveSelectedMember(family, { 1: 11, 2: 999 }), undefined);
}
for (const values of [[color(11, 'Black'), color(12, 'White')], [size(21, '39'), size(22, '41')]]) {
  const family = { root_product_id: 1, members: [member(1, [values[0]]), member(2, [values[1]])] };
  assert.equal(familyAttributes(family.members).length, 1);
  assert.equal(resolveSelectedMember(family, memberSelection(family.members[0]))?.product_id, 1, 'parent is a normal combination');
  assert.equal(resolveSelectedMember(family, memberSelection(family.members[1]))?.product_id, 2);
}
const family = { root_product_id: 1, members: [
  member(1, [color(11, 'Black'), size(21, 'M')]),
  member(2, [color(12, 'White'), size(22, 'L')]),
] };
const before = structuredClone(family);
assert.deepEqual(changeFamilySelection(family.members, { 1: 11, 2: 21 }, 1, 12), { 1: 12 });
assert.equal(resolveSelectedMember(family, { 1: 12, 2: 21 }), undefined);
assert.equal(optionIsAvailable(family.members, familyAttributes(family.members), { 1: 12 }, 2, 21), false);
assert.deepEqual(family, before);
const sold = { ...family, members: [family.members[0], member(2, [color(12, 'White'), size(22, 'L')], 0)] };
assert.equal(memberIsPurchasable(sold.members[1]), false);
assert.equal(optionIsAvailable(sold.members, familyAttributes(sold.members), { 1: 12 }, 2, 22), false);
const duplicate = { ...family, members: [...family.members, member(3, family.members[0].attribute_values, 0)] };
assert.equal(resolveSelectedMember(duplicate, { 1: 11, 2: 21 }), undefined, 'even a direct route must not bypass duplicate combinations');
const rootEmpty = { ...family, members: [member(1, []), family.members[1]] };
assert.equal(resolveSelectedMember(rootEmpty, {}), undefined);
assert.deepEqual(matchingFamilyMembers(rootEmpty.members, { 1: 12 }).map(m => m.product_id), [2]);
assert.equal(resolveSelectedMember({ root_product_id: 1, members: [member(1, [])] }, {})?.product_id, 1);
assert.equal(resolveSelectedMember({ root_product_id: 1, members: [member(1, []), member(2, [])] }, {}), undefined);
console.log('Color/size selection: family-specific letter/numeric sizes, color-only, size-only, parent/child, missing/duplicate/sold-out and standalone checks PASS.');

for (const code of ['SIZE', 'SIZE_SHOES', 'SIZE_GIAY', 'SIZE_TROUSERS', 'SIZE39']) {
  assert.equal(isColorOrSize(value(4, code, 41, '39')), true);
  const family = { root_product_id: 1, members: [
    member(1, [color(11, 'Black'), value(4, code, 41, '39')]),
    member(2, [color(11, 'Black'), value(4, code, 42, '40')]),
  ] };
  assert.deepEqual(familyAttributes(family.members).map(axis => axis.attribute_id), [1, 4]);
  assert.equal(resolveSelectedMember(family, { 1: 11 }), undefined);
  assert.equal(resolveSelectedMember(family, { 1: 11, 4: 41 })?.product_id, 1);
  assert.equal(resolveSelectedMember(family, { 1: 11, 4: 42 })?.product_id, 2);
  assert.equal(resolveSelectedMember(family, { 1: 11, 4: 999 }), undefined);
  const duplicate = { ...family, members: [...family.members, member(3, family.members[1].attribute_values)] };
  assert.equal(resolveSelectedMember(duplicate, { 1: 11, 4: 42 }), undefined);
}
for (const code of ['MATERIAL', 'SHOE_SIZE', 'OVERSIZE', 'size_shoes', 'COLOR_ALT']) {
  assert.equal(isColorOrSize(value(4, code, 41, '39')), false, 'only the uppercase SIZE prefix is added; COLOR stays exact');
}
console.log('SIZE prefix selection: exact SIZE and prefixed shoe/trouser sizes, missing/duplicate tuples and non-prefix controls PASS.');
