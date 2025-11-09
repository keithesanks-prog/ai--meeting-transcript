import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { api } from '../utils/api'

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea']

function OwnerWheel({ actions, onOwnerClick, selectedOwner, filterOnly = false }) {
  const navigate = useNavigate()
  const [ownerUserIds, setOwnerUserIds] = useState({})

  // Helper function to check if a name looks like a team name (not a person)
  const isLikelyTeamName = (name) => {
    if (!name) return true
    const lowerName = name.toLowerCase()
    return (
      name === 'UNASSIGNED' ||
      lowerName.includes("'s team") ||
      lowerName.includes(" team") ||
      lowerName.includes('team') ||
      lowerName.includes('qa') ||
      lowerName.includes('q&a') ||
      lowerName.includes('engineering') ||
      lowerName.includes('design') ||
      lowerName.includes('marketing') ||
      lowerName.includes('sales') ||
      lowerName.includes('support') ||
      lowerName.includes('department') ||
      lowerName.includes('group')
    )
  }

  // Fetch user IDs for owners (only if not in filter-only mode)
  useEffect(() => {
    if (filterOnly) return // Skip fetching user IDs if we're only filtering
    
    const fetchUserIds = async () => {
      const ownerNames = [...new Set(actions.map(a => a.owner).filter(Boolean))]
      const userIds = {}
      
      for (const name of ownerNames) {
        // Skip team names and UNASSIGNED to avoid unnecessary API calls
        if (isLikelyTeamName(name)) continue
        
        try {
          const user = await api.getUserByName(name)
          if (user) {
            userIds[name] = user.id
          }
        } catch (err) {
          // User not found (404) is expected for team names or non-user owners
          // Silently skip - don't log 404 errors as they're normal
          if (err.response?.status !== 404) {
            console.warn(`Error fetching user for owner "${name}":`, err.message)
          }
        }
      }
      
      setOwnerUserIds(userIds)
    }
    
    if (actions.length > 0) {
      fetchUserIds()
    }
  }, [actions, filterOnly])

  const ownerData = useMemo(() => {
    const ownerCounts = {}
    
    actions.forEach(action => {
      const owner = action.owner || 'UNASSIGNED'
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1
    })

    return Object.entries(ownerCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [actions])

  const handleOwnerClick = (ownerName) => {
    if (ownerName === 'UNASSIGNED') {
      if (onOwnerClick) {
        onOwnerClick(null)
      }
      return
    }
    
    // If filterOnly mode or onOwnerClick is provided, always filter
    if (filterOnly || onOwnerClick) {
      if (onOwnerClick) {
        onOwnerClick(ownerName === selectedOwner ? null : ownerName)
      }
    } else if (ownerUserIds[ownerName]) {
      // Only navigate if not filtering and we have a user ID
      navigate(`/profile/${ownerUserIds[ownerName]}`)
    }
  }

  if (ownerData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
        No owner data available
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={ownerData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            onClick={(data) => handleOwnerClick(data.name)}
            style={{ cursor: 'pointer' }}
          >
            {ownerData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke={selectedOwner === entry.name ? '#1e40af' : '#fff'}
                strokeWidth={selectedOwner === entry.name ? 3 : 1}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      
      <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
        {ownerData.map((entry, index) => (
          <div
            key={entry.name}
            onClick={() => handleOwnerClick(entry.name)}
            style={{
              padding: '0.5rem 1rem',
              background: selectedOwner === entry.name ? COLORS[index % COLORS.length] : '#f1f5f9',
              color: selectedOwner === entry.name ? 'white' : '#334155',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: selectedOwner === entry.name ? 600 : 400,
              border: `2px solid ${COLORS[index % COLORS.length]}`,
              transition: 'all 0.2s'
            }}
            title={filterOnly || onOwnerClick ? 'Click to filter' : (ownerUserIds[entry.name] ? 'Click to view profile' : 'Click to filter')}
          >
            {entry.name} ({entry.value})
          </div>
        ))}
      </div>
    </div>
  )
}

export default OwnerWheel

