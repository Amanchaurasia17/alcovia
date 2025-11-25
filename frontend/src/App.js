import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, TextInput } from 'react-native';
import io from 'socket.io-client';
import axios from 'axios';

// Hardcoded backend URL for production deployment
const BACKEND = 'https://alcovia-production-d12c.up.railway.app';

export default function App() {
  const [studentId, setStudentId] = useState('student1');
  const [status, setStatus] = useState('On Track');
  const [quizScore, setQuizScore] = useState('8');
  const [focusMinutes, setFocusMinutes] = useState('0');
  const [remedialTask, setRemedialTask] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // fetch student status
    axios.get(`${BACKEND}/student/${studentId}`).then(r => {
      setStatus(r.data.status || 'On Track');
      setRemedialTask(r.data.remedial_task || null);
    }).catch(()=>{});

    socketRef.current = io(BACKEND);
    socketRef.current.emit('join', `student:${studentId}`);
    socketRef.current.on('status', (data) => {
      setStatus(data.status);
      if (data.assigned_task) setRemedialTask(data.assigned_task);
    });

    // Cheater detection disabled for testing
    // const handleVisibility = () => {
    //   if (document.hidden) {
    //     axios.post(`${BACKEND}/daily-checkin`, { student_id: studentId, quiz_score: 0, focus_minutes: 0 });
    //   }
    // };
    // document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      // document.removeEventListener('visibilitychange', handleVisibility);
      socketRef.current?.disconnect();
    };
  }, [studentId]);

  const submitCheckin = async () => {
    const r = await axios.post(`${BACKEND}/daily-checkin`, { student_id: studentId, quiz_score: Number(quizScore), focus_minutes: Number(focusMinutes) });
    setStatus(r.data.status);
  };

  const markComplete = async () => {
    await axios.post(`${BACKEND}/complete-remedial`, { student_id: studentId });
    setStatus('On Track');
    setRemedialTask(null);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Alcovia Focus Mode - Student: {studentId}</Text>
      <Text>Status: {status}</Text>

      {status === 'On Track' && (
        <View>
          <Button title="Start Focus Timer" onPress={() => alert('Start timer (demo)')} />
          <Text>Daily Quiz Score</Text>
          <TextInput value={quizScore} onChangeText={setQuizScore} keyboardType="numeric" style={{borderWidth:1,padding:8,marginVertical:8}} />
          <Text>Focus Minutes</Text>
          <TextInput value={focusMinutes} onChangeText={setFocusMinutes} keyboardType="numeric" style={{borderWidth:1,padding:8,marginVertical:8}} />
          <Button title="Submit Check-in" onPress={submitCheckin} />
        </View>
      )}

      {status === 'Needs Intervention' && (
        <View>
          <Text>Analysis in progress. Waiting for Mentor...</Text>
        </View>
      )}

      {status === 'Remedial' && remedialTask && (
        <View>
          <Text>Task: {remedialTask}</Text>
          <Button title="Mark Complete" onPress={markComplete} />
        </View>
      )}
    </View>
  );
}
