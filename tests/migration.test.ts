import test from 'node:test';
import assert from 'node:assert/strict';
import { postgresQuery } from '../db/database.ts';
import { safeRelativeReturnPath } from '../lib/return-path.ts';
import { isPublicAddress } from '../db/public-fetch.ts';
test('PDF fetch rejects private, loopback and mapped addresses', () => {
  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '172.16.1.2',
    '192.168.1.1',
    '::1',
    '::ffff:127.0.0.1',
    'fd00::1',
    'fe80::1',
  ])
    assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});
test('SQL binding preserves repeated positions and separates values', () => {
  assert.equal(postgresQuery('SELECT ?1, ?1, ?1'), 'SELECT $1, $1, $1');
  assert.equal(
    postgresQuery('INSERT INTO authors (name,handle) VALUES (?,?)'),
    'INSERT INTO authors (name,handle) VALUES ($1,$2)',
  );
});
test('login return paths cannot leave the app or loop through auth routes', () => {
  for (const value of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/sign-in?redirect_url=https://evil.example',
    '/sign-up/a',
    '/login',
  ])
    assert.equal(safeRelativeReturnPath(value), '/account');
  assert.equal(
    safeRelativeReturnPath('/publication/or-2026-0001#discussion'),
    '/publication/or-2026-0001#discussion',
  );
});
