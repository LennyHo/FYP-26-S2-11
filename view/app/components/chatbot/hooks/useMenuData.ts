"use client";

import { useState, useEffect } from 'react';
import { getMenuItems } from '../../../utils/customerApi';
import type { DripTeaMenuItem } from '../../../utils/api.base';

export function useMenuData() {
  const [menuLookup, setMenuLookup] = useState<Record<string, { id: string; category: string }>>({});
  const [menuById, setMenuById] = useState<Record<string, DripTeaMenuItem>>({});

  useEffect(() => {
    getMenuItems('active').then(res => {
      const lookup: Record<string, { id: string; category: string }> = {};
      const byId: Record<string, DripTeaMenuItem> = {};
      (res.data || []).forEach(item => {
        const key = item.name.toLowerCase().replace(/\s+/g, '');
        lookup[key] = { id: item.id, category: item.category };
        byId[item.id] = item;
      });
      setMenuLookup(lookup);
      setMenuById(byId);
    }).catch(() => {});
  }, []);

  return { menuLookup, menuById };
}
