import assert from 'node:assert/strict';
import type { ProductAttributeValueDto, ProductFamilyDto, ProductFamilyMemberDto } from '../src/features/catalog/types';
import { familyAttributes, matchingFamilyMembers, memberSelection, memberIsPurchasable,
  resolveSelectedMember, changeFamilySelection, optionIsAvailable } from '../src/features/catalog/model/productFamilySelection';

const value = (attribute: number, option: number, label: string, defining = true): ProductAttributeValueDto => ({
  attribute_id: attribute, attribute_code: 'ATTR_' + attribute, attribute_name: 'Attribute ' + attribute,
  attribute_value_id: option, value: label, label, is_variant_defining: defining, sort_order: attribute,
});
const member = (id: number, values: ProductAttributeValueDto[], quantity = 3): ProductFamilyMemberDto => ({
  product_id: id, parent_product_id: id === 1 ? null : 1, sku: 'SKU-' + id, name: 'Product ' + id,
  selling_price: 100000 + id, status: 'ACTIVE', images: [], attribute_values: values,
  available_quantity: quantity, purchasable: quantity > 0,
});
let assertions = 0;
for (const sizes of [['S', 'M', 'L'], ['28', '30', '32'], ['39', '40', '42']]) {
  const family: ProductFamilyDto = { root_product_id: 1, members: sizes.map((size, i) =>
    member(i + 1, [value(1, 11, 'Black'), value(2, 20 + i, size), value(3, 31, 'Cotton', false)])) };
  assert.deepEqual(familyAttributes(family.members).map(a => a.attribute_id), [1, 2]);
  assert.equal(resolveSelectedMember(family, { 1: 11 }), undefined, 'partial choices never choose a size');
  for (let i = 0; i < sizes.length; i++) {
    assert.equal(resolveSelectedMember(family, { 1: 11, 2: 20 + i })?.product_id, i + 1);
    assertions++;
  }
}
const oneAxis: ProductFamilyDto = { root_product_id: 1, members: [member(1, [value(7, 71, 'Black')]), member(2, [value(7, 72, 'White')])] };
assert.equal(resolveSelectedMember(oneAxis, { 7: 72 })?.product_id, 2);
assert.equal(resolveSelectedMember(oneAxis, memberSelection(oneAxis.members[0]))?.product_id, 1, 'root is a normal sellable SKU');
const arbitrary: ProductFamilyDto = { root_product_id: 1, members: [
  member(1, [value(4, 41, 'Matte'), value(5, 51, '128GB'), value(6, 61, 'Long')]),
  member(2, [value(4, 42, 'Gloss'), value(5, 52, '256GB'), value(6, 62, 'Short')]),
] };
const before = structuredClone(arbitrary);
assert.equal(familyAttributes(arbitrary.members).length, 3);
assert.equal(resolveSelectedMember(arbitrary, { 4: 42, 5: 52 }), undefined);
assert.equal(resolveSelectedMember(arbitrary, { 4: 42, 5: 52, 6: 62 })?.product_id, 2);
assert.deepEqual(changeFamilySelection(arbitrary.members, { 4: 41, 5: 51, 6: 61 }, 4, 42), { 4: 42 });
assert.equal(resolveSelectedMember(arbitrary, { 4: 42, 5: 51, 6: 61 }), undefined);
assert.equal(optionIsAvailable(arbitrary.members, familyAttributes(arbitrary.members), { 4: 42 }, 5, 51), false);
assert.deepEqual(arbitrary, before, 'selection never mutates server data');
const sold = { ...oneAxis, members: [oneAxis.members[0], member(2, [value(7, 72, 'White')], 0)] };
assert.equal(memberIsPurchasable(sold.members[1]), false);
assert.equal(optionIsAvailable(sold.members, familyAttributes(sold.members), {}, 7, 72), false);
const duplicate = { ...oneAxis, members: [...oneAxis.members, member(3, [value(7, 72, 'White')], 0)] };
assert.equal(resolveSelectedMember(duplicate, { 7: 72 }), undefined, 'stock cannot conceal ambiguity');
const rootEmpty = { ...oneAxis, members: [member(1, []), member(2, [value(7, 72, 'White')])] };
assert.equal(resolveSelectedMember(rootEmpty, {}) , undefined, 'root with no selectors never acts as wildcard');
assert.deepEqual(matchingFamilyMembers(rootEmpty.members, { 7: 72 }).map(m => m.product_id), [2]);
assert.equal(resolveSelectedMember({ root_product_id: 1, members: [member(1, [])] }, {})?.product_id, 1);
assert.equal(resolveSelectedMember({ root_product_id: 1, members: [member(1, []), member(2, [])] }, {}), undefined);
console.log('Dynamic selection: letter/numeric sizes, one/three axes, root/child, missing/duplicate/out-of-stock and standalone checks PASS (' + assertions + ' size combinations).');
